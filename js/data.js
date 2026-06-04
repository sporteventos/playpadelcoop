// ============================================
//  PLAY PADEL — Dados Partilhados
//  Carregado por todas as páginas (público + admin)
// ============================================

const DEFAULTS = {
  campos: [
    { id: 1, nome: 'Play Padel',    icone: '🎾', activo: true },
    { id: 2, nome: 'TVCabo',        icone: '🎾', activo: true },
    { id: 3, nome: 'Stella Artois', icone: '🎾', activo: true },
  ],
  categorias: [
    { id:'M1', nome:'Masculino 1', tipo:'M', nivel:1 },
    { id:'M2', nome:'Masculino 2', tipo:'M', nivel:2 },
    { id:'M3', nome:'Masculino 3', tipo:'M', nivel:3 },
    { id:'M4', nome:'Masculino 4', tipo:'M', nivel:4 },
    { id:'M5', nome:'Masculino 5', tipo:'M', nivel:5 },
    { id:'F1', nome:'Feminino 1',  tipo:'F', nivel:1 },
    { id:'F2', nome:'Feminino 2',  tipo:'F', nivel:2 },
  ],
  grupos: [
    { id:'M1-A', cat:'M1', letra:'A' }, { id:'M1-B', cat:'M1', letra:'B' }, { id:'M1-C', cat:'M1', letra:'C' },
    { id:'M2-A', cat:'M2', letra:'A' }, { id:'M2-B', cat:'M2', letra:'B' }, { id:'M2-C', cat:'M2', letra:'C' },
    { id:'M3-A', cat:'M3', letra:'A' }, { id:'M3-B', cat:'M3', letra:'B' }, { id:'M3-C', cat:'M3', letra:'C' }, { id:'M3-D', cat:'M3', letra:'D' },
    { id:'M4-A', cat:'M4', letra:'A' }, { id:'M4-B', cat:'M4', letra:'B' }, { id:'M4-C', cat:'M4', letra:'C' }, { id:'M4-D', cat:'M4', letra:'D' },
    { id:'M5-A', cat:'M5', letra:'A' }, { id:'M5-B', cat:'M5', letra:'B' },
    { id:'F1-A', cat:'F1', letra:'A' }, { id:'F1-B', cat:'F1', letra:'B' }, { id:'F1-C', cat:'F1', letra:'C' },
    { id:'F2-A', cat:'F2', letra:'A' }, { id:'F2-B', cat:'F2', letra:'B' }, { id:'F2-C', cat:'F2', letra:'C' },
  ],
  jogos: [
    // ---- 5 JUN — CAMPO PLAY PADEL ----
    { id:1,  data:'2026-06-05', hora:'17:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Edson Uamusse & Salomão',            eq2:'Ivandro Remane & João Peixoto',         resultado:null },
    { id:2,  data:'2026-06-05', hora:'18:30', campo:'Play Padel',    grupo:'F1-A', eq1:'Stacey & Marlou',                    eq2:'Cynthia Cavalcanti & Kátia Sousa',      resultado:null },
    { id:3,  data:'2026-06-05', hora:'19:30', campo:'Play Padel',    grupo:'M1-B', eq1:'Gonçalo Nascimento & João Catela',   eq2:'Naim Hassan & Sidik',                   resultado:null },
    { id:4,  data:'2026-06-05', hora:'20:30', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',    eq2:'Rehan Fayaz & Reehan M.',               resultado:null },
    { id:5,  data:'2026-06-05', hora:'21:30', campo:'Play Padel',    grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',          eq2:'Ricardo Oliveira & Vasco Silva',        resultado:null },
    // ---- 5 JUN — TVCABO ----
    { id:6,  data:'2026-06-05', hora:'17:30', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira', eq2:'Florence & Jinane',                     resultado:null },
    { id:7,  data:'2026-06-05', hora:'18:30', campo:'TVCabo',        grupo:'F2-A', eq1:'Donatella Detto & Julianna',         eq2:'Ilária & Monica',                       resultado:null },
    { id:8,  data:'2026-06-05', hora:'19:30', campo:'TVCabo',        grupo:'M1-C', eq1:'Ahmad & Uzeir',                     eq2:'Carlos Cardeano & José Santos',         resultado:null },
    { id:9,  data:'2026-06-05', hora:'20:30', campo:'TVCabo',        grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa',eq2:'Frederico Jonet & Francisco Ferreira', resultado:null },
    { id:10, data:'2026-06-05', hora:'21:30', campo:'TVCabo',        grupo:'M2-C', eq1:'Felipe Moniz & José Cossa',          eq2:'Faheem Adamo & Yann Trivellin',         resultado:null },
    // ---- 5 JUN — STELLA ARTOIS ----
    { id:11, data:'2026-06-05', hora:'17:30', campo:'Stella Artois', grupo:'F2-C', eq1:'Nilda & Lize',                      eq2:'Dalila & Tatiana',                      resultado:null },
    { id:12, data:'2026-06-05', hora:'18:30', campo:'Stella Artois', grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu', eq2:'Luis Antunes & Manuel Neto',            resultado:null },
    { id:13, data:'2026-06-05', hora:'19:30', campo:'Stella Artois', grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',       eq2:'Steph & Ronell',                        resultado:null },
    { id:14, data:'2026-06-05', hora:'20:30', campo:'Stella Artois', grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',      eq2:'Érica Capela & Sarah Taillon',          resultado:null },
    { id:15, data:'2026-06-05', hora:'21:30', campo:'Stella Artois', grupo:'M3-B', eq1:'Shueb & Sahad',                     eq2:'Ugo Gião & Nuno Henriques',             resultado:null },
    // ---- 6 JUN — PLAY PADEL ----
    { id:16, data:'2026-06-06', hora:'07:00', campo:'Play Padel',    grupo:'F2-B', eq1:'Glória & Luciana Lauriano',          eq2:'Paty & Mila',                           resultado:null },
    { id:17, data:'2026-06-06', hora:'08:00', campo:'Play Padel',    grupo:'M2-B', eq1:'Jameel & Tahir',                    eq2:'Dej Cruz & Fabio Damato',               resultado:null },
    { id:18, data:'2026-06-06', hora:'09:00', campo:'Play Padel',    grupo:'F1-A', eq1:'Helen Khumalo & Narcisa Nhamitambo',eq2:'Caironice & Carmen',                    resultado:null },
    { id:19, data:'2026-06-06', hora:'10:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Inês Pires & Daniela Duarte',       eq2:'Celine Sieu & Ana Pezarat',             resultado:null },
    { id:20, data:'2026-06-06', hora:'12:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Marta Botelho & Ana Oliveira',      eq2:'Diana Carvalho & Ilga João',            resultado:null },
    { id:21, data:'2026-06-06', hora:'13:00', campo:'Play Padel',    grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu', eq2:'João Alberty & Manel Alberty',          resultado:null },
    { id:22, data:'2026-06-06', hora:'14:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Anouk Fumane & Letícia',            eq2:'Ohmar Fernandes & Claudia',             resultado:null },
    { id:23, data:'2026-06-06', hora:'15:00', campo:'Play Padel',    grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',               eq2:'Elves & Uweizy',                        resultado:null },
    { id:24, data:'2026-06-06', hora:'16:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Rehan Fayaz & Reehan M.',           eq2:'Naim Hassan & Sidik',                   resultado:null },
    { id:25, data:'2026-06-06', hora:'17:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Rui Lourenço & Francisco Pegado',   eq2:'Shezane Arif & Razeen',                 resultado:null },
    { id:26, data:'2026-06-06', hora:'18:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',   eq2:'Gonçalo Nascimento & João Catela',      resultado:null },
    { id:27, data:'2026-06-06', hora:'19:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',                eq2:'Carlos Cardeano & José Santos',         resultado:null },
    { id:28, data:'2026-06-06', hora:'20:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',     eq2:'Sharik Omar & Muhamad Mussagy',         resultado:null },
    { id:29, data:'2026-06-06', hora:'21:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Keiss Chiraze & Saif Issa',         eq2:'Akil & Kalil',                          resultado:null },
    // ---- 6 JUN — TVCABO ----
    { id:30, data:'2026-06-06', hora:'07:00', campo:'TVCabo',        grupo:'M4-D', eq1:'Jason & Bosch',                     eq2:'Luis Vaz & Sérgio Gomes',               resultado:null },
    { id:31, data:'2026-06-06', hora:'08:00', campo:'TVCabo',        grupo:'F2-B', eq1:'Shanel & Kaitlynn',                 eq2:'Karina Darsan & Bethany',               resultado:null },
    { id:32, data:'2026-06-06', hora:'09:00', campo:'TVCabo',        grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',      eq2:'Alcy Heim & Gabriel Heim',              resultado:null },
    { id:33, data:'2026-06-06', hora:'10:00', campo:'TVCabo',        grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',    eq2:'João Henriques & Bruno Morais',         resultado:null },
    { id:34, data:'2026-06-06', hora:'14:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',         eq2:'Faheem Adamo & Yann Trivellin',         resultado:null },
    { id:35, data:'2026-06-06', hora:'15:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Florence & Jinane',                 eq2:'Ilária & Monica',                       resultado:null },
    { id:36, data:'2026-06-06', hora:'16:00', campo:'TVCabo',        grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',             eq2:'Filipe Ferreira & Paulo Baldaia',       resultado:null },
    { id:37, data:'2026-06-06', hora:'17:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira',eq2:'Donatella Detto & Julianna',            resultado:null },
    { id:38, data:'2026-06-06', hora:'18:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Stacey & Marlou',                   eq2:'Helen Khumalo & Narcisa Nhamitambo',    resultado:null },
    { id:39, data:'2026-06-06', hora:'19:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Andrea & Mikel Álvarez',            eq2:'Alao Almeida & Ayaan Mussa',            resultado:null },
    // ---- 6 JUN — STELLA ARTOIS ----
    { id:40, data:'2026-06-06', hora:'07:00', campo:'Stella Artois', grupo:'M3-D', eq1:'Alexandre Salazar & Pedro Gonzalez',eq2:'Gonçalo Marques & Pedro Gonçalves',    resultado:null },
    { id:41, data:'2026-06-06', hora:'08:00', campo:'Stella Artois', grupo:'M2-C', eq1:'Felipe Moniz & José Cossa',         eq2:'Ricardo Oliveira & Vasco Silva',        resultado:null },
    { id:42, data:'2026-06-06', hora:'09:00', campo:'Stella Artois', grupo:'M3-A', eq1:'Abdul Ibraimo & Guilherme Godinho', eq2:'Dejan Petrovic & Isidro Simões',        resultado:null },
    { id:43, data:'2026-06-06', hora:'14:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',       eq2:'Nilda & Lize',                          resultado:null },
    { id:44, data:'2026-06-06', hora:'15:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Dalila & Tatiana',                  eq2:'Steph & Ronell',                        resultado:null },
    { id:45, data:'2026-06-06', hora:'16:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Rayhan & Arsheel',                  eq2:'Faheem Aboobakar & Mikaeel Taibo',      resultado:null },
    { id:46, data:'2026-06-06', hora:'17:00', campo:'Stella Artois', grupo:'M3-A', eq1:'José Mestre & Koenraad',            eq2:'Burhan Hassan & Sarfaraz',              resultado:null },
    { id:47, data:'2026-06-06', hora:'18:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                    eq2:'Shiraz & Kheizar',                      resultado:null },
    { id:48, data:'2026-06-06', hora:'19:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Fádhil Khan & Kelyo',               eq2:'Reihan Adamo & Nabil Manga',            resultado:null },
    // ---- 7 JUN — PLAY PADEL ----
    { id:49, data:'2026-06-07', hora:'07:00', campo:'Play Padel',    grupo:'M4-A', eq1:'João Pignatelli & Joel Almeida',    eq2:'Pablo & Galo Rivera',                   resultado:null },
    { id:50, data:'2026-06-07', hora:'08:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',      eq2:'Celine Sieu & Ana Pezarat',             resultado:null },
    { id:51, data:'2026-06-07', hora:'09:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Sharik Omar & Muhamad Mussagy',     eq2:'Akil & Kalil',                          resultado:null },
    { id:52, data:'2026-06-07', hora:'10:00', campo:'Play Padel',    grupo:'M5-A', eq1:'Alcy Heim & Gabriel Heim',          eq2:'Hamdan & Huzeifah',                     resultado:null },
    { id:53, data:'2026-06-07', hora:'11:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Omar Fernandes & Claudia',          eq2:'Diana Carvalho & Ilga João',            resultado:null },
    { id:54, data:'2026-06-07', hora:'12:00', campo:'Play Padel',    grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu', eq2:'Faizal & Sherial',                      resultado:null },
    { id:55, data:'2026-06-07', hora:'13:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Rehan Fayaz & Reehan M.',           eq2:'Gonçalo Nascimento & João Catela',      resultado:null },
    { id:56, data:'2026-06-07', hora:'14:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Frederico Jonet & Francisco Ferreira',eq2:'Shezane Arif & Razeen',              resultado:null },
    { id:57, data:'2026-06-07', hora:'15:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Carlos Cardeano & José Santos',     eq2:'Fernando & Rui Rocha',                  resultado:null },
    { id:58, data:'2026-06-07', hora:'16:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Érica Capela & Sarah Taillon',      eq2:'Inês Pires & Daniela Duarte',           resultado:null },
    { id:59, data:'2026-06-07', hora:'17:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',   eq2:'Naim Hassan & Sidik',                   resultado:null },
    { id:60, data:'2026-06-07', hora:'18:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',                eq2:'Ahmad & Uzeir',                         resultado:null },
    { id:61, data:'2026-06-07', hora:'19:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',     eq2:'Keiss Chiraze & Saif Issa',             resultado:null },
    { id:62, data:'2026-06-07', hora:'20:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa',eq2:'Rui Lourenço & Francisco Pegado',    resultado:null },
    // ---- 7 JUN — TVCABO ----
    { id:63, data:'2026-06-07', hora:'07:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira',eq2:'Ilária & Monica',                       resultado:null },
    { id:64, data:'2026-06-07', hora:'08:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Florence & Jinane',                 eq2:'Donatella Detto & Julianna',            resultado:null },
    { id:65, data:'2026-06-07', hora:'09:00', campo:'TVCabo',        grupo:'M3-B', eq1:'Ugo Gião & Nuno Henriques',         eq2:'Edson Uamusse & Salomão',               resultado:null },
    { id:66, data:'2026-06-07', hora:'10:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Stacey & Marlou',                   eq2:'Caironice & Carmen',                    resultado:null },
    { id:67, data:'2026-06-07', hora:'11:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Helen Khumalo & Narcisa Nhamitambo',eq2:'Cynthia Cavalcanti & Kátia Sousa',     resultado:null },
    { id:68, data:'2026-06-07', hora:'12:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Duncan & James',                    eq2:'Andrea & Mikel Álvarez',                resultado:null },
    { id:69, data:'2026-06-07', hora:'13:00', campo:'TVCabo',        grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',               eq2:'Alexandre Salazar & Pedro Gonzalez',    resultado:null },
    { id:70, data:'2026-06-07', hora:'14:00', campo:'TVCabo',        grupo:'M3-D', eq1:'Gonçalo Marques & Pedro Gonçalves', eq2:'Elves & Uweizy',                        resultado:null },
    { id:71, data:'2026-06-07', hora:'15:00', campo:'TVCabo',        grupo:'M3-B', eq1:'Shueb & Sahad',                     eq2:'Edson Uamusse & Salomão',               resultado:null },
    { id:72, data:'2026-06-07', hora:'16:00', campo:'TVCabo',        grupo:'M4-D', eq1:'Jason & Bosch',                     eq2:'Luis Trigo de Morais & Pedro Mandlate', resultado:null },
    { id:73, data:'2026-06-07', hora:'17:00', campo:'TVCabo',        grupo:'F1-C', eq1:'Anouk Fumane & Letícia',            eq2:'Marta Botelho & Ana Oliveira',          resultado:null },
    { id:74, data:'2026-06-07', hora:'18:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Nuno Resende & Gonçalo Bettencourt',eq2:'Alao Almeida & Ayaan Mussa',           resultado:null },
    { id:75, data:'2026-06-07', hora:'19:00', campo:'TVCabo',        grupo:'M3-A', eq1:'Burhan Hassan & Sarfaraz',          eq2:'Dejan Petrovic & Isidro Simões',        resultado:null },
    { id:76, data:'2026-06-07', hora:'20:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',         eq2:'Felipe Moniz & José Cossa',             resultado:null },
    { id:77, data:'2026-06-07', hora:'21:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Faheem Adamo & Yann Trivellin',     eq2:'Ricardo Oliveira & Vasco Silva',        resultado:null },
    // ---- 7 JUN — STELLA ARTOIS ----
    { id:78, data:'2026-06-07', hora:'07:00', campo:'Stella Artois', grupo:'F2-B', eq1:'Glória & Luciana Lauriano',         eq2:'Karina Darsan & Bethany',               resultado:null },
    { id:79, data:'2026-06-07', hora:'08:00', campo:'Stella Artois', grupo:'F2-B', eq1:'Shanel & Kaitlynn',                 eq2:'Paty & Mila',                           resultado:null },
    { id:80, data:'2026-06-07', hora:'09:00', campo:'Stella Artois', grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',    eq2:'Jameel & Tahir',                        resultado:null },
    { id:81, data:'2026-06-07', hora:'10:00', campo:'Stella Artois', grupo:'M2-B', eq1:'João Henriques & Bruno Morais',     eq2:'Dej Cruz & Fabio Damato',               resultado:null },
    { id:82, data:'2026-06-07', hora:'12:00', campo:'Stella Artois', grupo:'M4-D', eq1:'Luis Vaz & Sérgio Gomes',           eq2:'Luis Trigo de Morais & Pedro Mandlate', resultado:null },
    { id:83, data:'2026-06-07', hora:'13:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                    eq2:'Fádhil Khan & Kelyo',                   resultado:null },
    { id:84, data:'2026-06-07', hora:'14:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Shiraz & Kheizar',                  eq2:'Reihan Adamo & Nabil Manga',            resultado:null },
    { id:85, data:'2026-06-07', hora:'15:00', campo:'Stella Artois', grupo:'M4-D', eq1:'Jason & Bosch',                    eq2:'Muhammad Chona & Ibrahim Bilal',         resultado:null },
    { id:86, data:'2026-06-07', hora:'16:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Nilda & Lize',                     eq2:'Steph & Ronell',                         resultado:null },
    { id:87, data:'2026-06-07', hora:'17:00', campo:'Stella Artois', grupo:'M4-A', eq1:'Pablo & Galo Rivera',               eq2:'André Reves & Francisco Morais',         resultado:null },
    { id:88, data:'2026-06-07', hora:'18:00', campo:'Stella Artois', grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',      eq2:'Faizaan Ravat & Ranim Ahmad',            resultado:null },
    { id:89, data:'2026-06-07', hora:'19:00', campo:'Stella Artois', grupo:'M1-A', eq1:'Luis Antunes & Manuel Neto',        eq2:'João Alberty & Manel Alberty',           resultado:null },
    { id:90, data:'2026-06-07', hora:'20:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Filipe Ferreira & Paulo Baldaia',   eq2:'Faheem Aboobakar & Mikaeel Taibo',       resultado:null },
    { id:91, data:'2026-06-07', hora:'21:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',             eq2:'Rayhan & Arsheel',                       resultado:null },
    // ---- 8 JUN ----
    { id:92,  data:'2026-06-08', hora:'17:30', campo:'Play Padel',    grupo:'F1-C', eq1:'Marta Botelho & Ana Oliveira',     eq2:'Ohmar Fernandes & Claudia',              resultado:null },
    { id:93,  data:'2026-06-08', hora:'18:30', campo:'Play Padel',    grupo:'M4-A', eq1:'Joshua & Noah',                    eq2:'João Pignatelli & Joel Almeida',         resultado:null },
    { id:94,  data:'2026-06-08', hora:'19:30', campo:'Play Padel',    grupo:'M1-C', eq1:'Ahmad & Uzeir',                    eq2:'Fernando & Rui Rocha',                   resultado:null },
    { id:95,  data:'2026-06-08', hora:'20:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Ugo Gião & Nuno Henriques',        eq2:'Ivandro Remane & João Peixoto',          resultado:null },
    { id:96,  data:'2026-06-08', hora:'21:30', campo:'Play Padel',    grupo:'M1-A', eq1:'Luis Antunes & Manuel Neto',       eq2:'Faizal & Sherial',                       resultado:null },
    { id:97,  data:'2026-06-08', hora:'17:30', campo:'TVCabo',        grupo:'F2-B', eq1:'Glória & Luciana Lauriano',        eq2:'Shanel & Kaitlynn',                      resultado:null },
    { id:98,  data:'2026-06-08', hora:'18:30', campo:'TVCabo',        grupo:'M5-A', eq1:'Faizan Ravat & Ranim Ahmad',       eq2:'Alcy Heim & Gabriel Heim',               resultado:null },
    { id:99,  data:'2026-06-08', hora:'19:30', campo:'TVCabo',        grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',     eq2:'Inês Pires & Daniela Duarte',            resultado:null },
    { id:100, data:'2026-06-08', hora:'20:30', campo:'TVCabo',        grupo:'M1-A', eq1:'Faizal & Sherial',                 eq2:'João Alberty & Manel Alberty',           resultado:null },
    { id:101, data:'2026-06-08', hora:'21:30', campo:'TVCabo',        grupo:'M3-A', eq1:'José Mestre & Koenraad',           eq2:'Abdul Ibraimo & Guilherme Godinho',       resultado:null },
    { id:102, data:'2026-06-08', hora:'17:30', campo:'Stella Artois', grupo:'F2-B', eq1:'Paty & Mila',                     eq2:'Karina Darsan & Bethany',                resultado:null },
    { id:103, data:'2026-06-08', hora:'18:30', campo:'Stella Artois', grupo:'F1-A', eq1:'Caironice & Carmen',               eq2:'Cynthia Cavalcanti & Kátia Sousa',       resultado:null },
    { id:104, data:'2026-06-08', hora:'19:30', campo:'Stella Artois', grupo:'M4-B', eq1:'Duncan & James',                   eq2:'Nuno Resende & Gonçalo Bettencourt',     resultado:null },
    { id:105, data:'2026-06-08', hora:'20:30', campo:'Stella Artois', grupo:'F1-B', eq1:'Érica Capela & Sarah Taillon',     eq2:'Celine Sieu & Ana Pezarat',              resultado:null },
    { id:106, data:'2026-06-08', hora:'21:30', campo:'Stella Artois', grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',     eq2:'Hamdan & Huzeifah',                      resultado:null },
    // ---- 9 JUN ----
    { id:107, data:'2026-06-09', hora:'17:30', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',    eq2:'Akil & Kalil',                           resultado:null },
    { id:108, data:'2026-06-09', hora:'18:30', campo:'Play Padel',    grupo:'M4-A', eq1:'Joshua & Noah',                    eq2:'André Reves & Francisco Morais',         resultado:null },
    { id:109, data:'2026-06-09', hora:'19:30', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',               eq2:'Fernando & Rui Rocha',                   resultado:null },
    { id:110, data:'2026-06-09', hora:'20:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Shueb & Sahad',                    eq2:'Ivandro Remane & João Peixoto',          resultado:null },
    { id:111, data:'2026-06-09', hora:'21:30', campo:'Play Padel',    grupo:'M3-A', eq1:'Burhan Hassan & Sarfaraz',         eq2:'Abdul Ibraimo & Guilherme Godinho',       resultado:null },
    { id:112, data:'2026-06-09', hora:'17:30', campo:'TVCabo',        grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',   eq2:'Dej Cruz & Fabio Damato',                resultado:null },
    { id:113, data:'2026-06-09', hora:'18:30', campo:'TVCabo',        grupo:'M3-A', eq1:'José Mestre & Koenraad',           eq2:'Dejan Petrovic & Isidro Simões',         resultado:null },
    { id:114, data:'2026-06-09', hora:'19:30', campo:'TVCabo',        grupo:'M4-B', eq1:'Andrea & Mikel Álvarez',           eq2:'Nuno Resende & Gonçalo Bettencourt',     resultado:null },
    { id:115, data:'2026-06-09', hora:'20:30', campo:'TVCabo',        grupo:'M5-A', eq1:'Faizan Ravat & Ranim Ahmad',       eq2:'Hamdan & Huzeifah',                      resultado:null },
    { id:116, data:'2026-06-09', hora:'21:30', campo:'TVCabo',        grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa',eq2:'Shezane Arif & Razeen',              resultado:null },
    { id:117, data:'2026-06-09', hora:'17:30', campo:'Stella Artois', grupo:'M2-A', eq1:'Frederico Jonet & Francisco Ferreira',eq2:'Rui Lourenço & Francisco Pegado',   resultado:null },
    { id:118, data:'2026-06-09', hora:'18:30', campo:'Stella Artois', grupo:'M3-C', eq1:'Sharik Omar & Muhamad Mussagy',    eq2:'Keiss Chiraze & Saif Issa',              resultado:null },
    { id:119, data:'2026-06-09', hora:'19:30', campo:'Stella Artois', grupo:'F1-C', eq1:'Anouk Fumane & Letícia',           eq2:'Diana Carvalho & Ilga João',             resultado:null },
    { id:120, data:'2026-06-09', hora:'20:30', campo:'Stella Artois', grupo:'M2-B', eq1:'João Henriques & Bruno Morais',    eq2:'Jameel & Tahir',                         resultado:null },
    // ---- 10 JUN ----
    { id:121, data:'2026-06-10', hora:'17:30', campo:'Play Padel',    grupo:'M4-A', eq1:'João Pignatelli & Joel Almeida',   eq2:'André Reves & Francisco Morais',         resultado:null },
    { id:122, data:'2026-06-10', hora:'18:30', campo:'Play Padel',    grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',              eq2:'Gonçalo Marques & Pedro Gonçalves',      resultado:null },
    { id:123, data:'2026-06-10', hora:'19:30', campo:'Play Padel',    grupo:'M3-D', eq1:'Alexandre Salazar & Pedro Gonzalez',eq2:'Elves & Uweizy',                       resultado:null },
    { id:124, data:'2026-06-10', hora:'20:30', campo:'Play Padel',    grupo:'M4-C', eq1:'Shiraz & Kheizar',                 eq2:'Fádhil Khan & Kelyo',                    resultado:null },
    { id:125, data:'2026-06-10', hora:'17:30', campo:'TVCabo',        grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',      eq2:'Dalila & Tatiana',                       resultado:null },
    { id:126, data:'2026-06-10', hora:'18:30', campo:'TVCabo',        grupo:'M4-A', eq1:'Joshua & Noah',                    eq2:'Pablo & Galo Rivera',                    resultado:null },
    { id:127, data:'2026-06-10', hora:'19:30', campo:'TVCabo',        grupo:'M5-B', eq1:'Filipe Ferreira & Paulo Baldaia',  eq2:'Rayhan & Arsheel',                       resultado:null },
    { id:128, data:'2026-06-10', hora:'20:30', campo:'TVCabo',        grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',            eq2:'Faheem Aboobakar & Mikaeel Taibo',        resultado:null },
    { id:129, data:'2026-06-10', hora:'17:30', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                   eq2:'Reihan Adamo & Nabil Manga',              resultado:null },
    { id:130, data:'2026-06-10', hora:'18:30', campo:'Stella Artois', grupo:'M4-B', eq1:'Duncan & James',                   eq2:'Alao Almeida & Ayaan Mussa',              resultado:null },
    { id:131, data:'2026-06-10', hora:'19:30', campo:'Stella Artois', grupo:'M4-D', eq1:'Muhammad Chona & Ibrahim Bilal',   eq2:'Luis Vaz & Sérgio Gomes',                resultado:null },
    { id:132, data:'2026-06-10', hora:'20:30', campo:'Stella Artois', grupo:'M4-D', eq1:'Muhammad Chona & Ibrahim Bilal',   eq2:'Luis Trigo de Morais & Pedro Mandlate',  resultado:null },
  ],
  telefones: {},
};

// ---- Storage helpers ----
function ppLoad(key) {
  try { const r = localStorage.getItem('pp_' + key); return r ? JSON.parse(r) : null; } catch { return null; }
}
function ppSave(key, data) { localStorage.setItem('pp_' + key, JSON.stringify(data)); }
function ppGet(key)  { return ppLoad(key) ?? JSON.parse(JSON.stringify(DEFAULTS[key] ?? [])); }

// ---- Utilitários de data ----
function ppFormatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(day)} ${meses[parseInt(m)-1]}`;
}

// ── Remote data sync (Option A — GitHub Pages) ─────────────────────────────
// Fetches data.json from the deployed site, populates localStorage,
// then fires 'pp:datasynced' so public pages can re-render with live data.
(function () {
  if (typeof window === 'undefined') return;
  if (window.location.protocol === 'file:') return; // skip when opened locally
  var KEYS = ['campos', 'categorias', 'grupos', 'jogadores', 'duplas', 'jogos', 'fasefinal', 'telefones', 'users'];

  // On admin: always fetch, but only overwrite local data if remote _updated is newer.
  // Exception: 'users' is always updated from remote to ensure synced users are available on login.
  if (window.location.pathname.includes('admin') && localStorage.getItem('pp_jogos') !== null) {
    window.ppDataReady = fetch('data.json?_=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : Promise.reject('404'); })
      .then(function (d) {
        // Always update users from remote so operator accounts created on another device are available
        if (d['users'] !== undefined) ppSave('users', d['users']);
        var stored = localStorage.getItem('pp__updated') || '0';
        var remote = d._updated || '0';
        if (remote > stored) {
          KEYS.forEach(function (k) { if (k !== 'users' && d[k] !== undefined) ppSave(k, d[k]); });
          localStorage.setItem('pp__updated', remote);
          window.dispatchEvent(new CustomEvent('pp:datasynced', { detail: d }));
        }
        return true;
      })
      .catch(function () { return false; });
    return;
  }

  window.ppDataReady = fetch('data.json?_=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : Promise.reject('404'); })
    .then(function (d) {
      KEYS.forEach(function (k) {
        if (d[k] !== undefined) ppSave(k, d[k]);
      });
      if (d._updated) localStorage.setItem('pp__updated', d._updated);
      window.dispatchEvent(new CustomEvent('pp:datasynced', { detail: d }));
      return true;
    })
    .catch(function () { return false; });
}());

function ppWeekday(d) {
  if (!d) return '';
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return dias[new Date(d + 'T12:00:00').getDay()];
}
