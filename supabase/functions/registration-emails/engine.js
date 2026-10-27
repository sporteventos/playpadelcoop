export class DeliveryError extends Error {
  constructor(code, retryable) {
    super(code);
    this.retryable = retryable;
  }
}

export class NotificationEngine {
  constructor(config, fetcher = fetch, clock = Date.now) {
    this.config = config;
    this.fetcher = fetcher;
    this.clock = clock;
    this.cachedToken = null;
  }

  async request(url, options) {
    try {
      return await this.fetcher(url, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new DeliveryError("engine_network_timeout", true);
    }
  }

  async token() {
    if (this.cachedToken && this.cachedToken.expiresAt > this.clock()) {
      return this.cachedToken.value;
    }
    const response = await this.request(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });
    if (!response.ok) {
      throw new DeliveryError(
        `token_http_${response.status}`,
        response.status === 429 || response.status >= 500,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new DeliveryError("token_invalid_response", true);
    }
    if (typeof data.access_token !== "string" || !data.access_token) {
      throw new DeliveryError("token_missing_access_token", true);
    }
    const expiresIn = Number(data.expires_in);
    this.cachedToken = {
      value: data.access_token,
      expiresAt: this.clock() +
        Math.max(0, (Number.isFinite(expiresIn) ? expiresIn : 0) - 30) * 1000,
    };
    return this.cachedToken.value;
  }

  async call(path, options) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.token();
      const response = await this.request(
        this.config.apiUrl.replace(/\/$/, "") + path,
        {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      if (response.status === 401 && attempt === 0) {
        this.cachedToken = null;
        continue;
      }
      if (!response.ok) {
        throw new DeliveryError(
          `engine_http_${response.status}`,
          response.status === 429 || response.status >= 500,
        );
      }
      if (response.status !== 200 && response.status !== 202) {
        throw new DeliveryError("engine_unexpected_success_status", true);
      }
      try {
        return await response.json();
      } catch {
        throw new DeliveryError("engine_invalid_response", true);
      }
    }
  }

  async send(event, content) {
    const data = await this.call("/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": event.idempotency_key,
      },
      body: JSON.stringify({
        channel: "EMAIL",
        recipient: event.recipient,
        subject: content.subject,
        body: content.body,
        bodyFormat: "HTML",
        externalReference:
          `playpadelcoop:${event.event_name}:${event.registration_id}`.slice(
            0,
            120,
          ),
        sensitive: true,
      }),
    });
    if (!data || typeof data.id !== "string" || !data.id) {
      throw new DeliveryError("engine_missing_notification_id", true);
    }
    return data.id;
  }

  async status(providerId) {
    return await this.call(`/notifications/${encodeURIComponent(providerId)}`, {
      method: "GET",
    });
  }
}
