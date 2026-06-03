// ============================================
//  PLAY PADEL — Admin Backoffice
//  Dados iniciais + lógica completa
// ============================================

// ---- Estado global ----
const APP = {
  currentView: 'dashboard',
  editingId: null,
  ffEditing: null,   // { catId, jogoId } when editing a knockout game
};

// DEFAULTS, ppGet, ppSave, ppLoad, ppFormatDate, ppWeekday
// definidos em js/data.js — carregado antes deste ficheiro.

// Compatibilidade interna
const getData = ppGet;
const setData = (k, v) => { ppSave(k, v); if (typeof GHSync !== 'undefined') GHSync.markDirty(); };
const formatDate = ppFormatDate;

// ============================================
//  DADOS INICIAIS (mantidos em data.js)
// ============================================
const _UNUSED_DEFAULTS = {
  campos: [
    { id: 1, nome: 'Play Padel',    icone: '🎾', cor: '#00C37B', activo: true },
    { id: 2, nome: 'TVCabo',        icone: '🎾', cor: '#4A9EFF', activo: true },
    { id: 3, nome: 'Stella Artois', icone: '🎾', cor: '#F5C518', activo: true },
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
  jogadores: [
    // Pré-carregados automaticamente a partir dos jogos
  ],
  jogos: [
    // ---- 5 JUN (CAMPO PLAY PADEL) ----
    { id:1,  data:'2026-06-05', hora:'17:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Edson Uamusse & Salomão',           eq2:'Ivandro Remane & João Peixoto',        resultado:null },
    { id:2,  data:'2026-06-05', hora:'18:30', campo:'Play Padel',    grupo:'F1-A', eq1:'Stacey & Marlou',                   eq2:'Cynthia Cavalcanti & Kátia Sousa',     resultado:null },
    { id:3,  data:'2026-06-05', hora:'19:30', campo:'Play Padel',    grupo:'M1-B', eq1:'Gonçalo Nascimento & João Catela',  eq2:'Naim Hassan & Sidik',                  resultado:null },
    { id:4,  data:'2026-06-05', hora:'20:30', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',   eq2:'Rehan Fayaz & Reehan M.',              resultado:null },
    { id:5,  data:'2026-06-05', hora:'21:30', campo:'Play Padel',    grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',         eq2:'Ricardo Oliveira & Vasco Silva',       resultado:null },
    // ---- 5 JUN (TVCABO) ----
    { id:6,  data:'2026-06-05', hora:'17:30', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira',eq2:'Florence & Jinane',                    resultado:null },
    { id:7,  data:'2026-06-05', hora:'18:30', campo:'TVCabo',        grupo:'F2-A', eq1:'Donatella Detto & Julianna',        eq2:'Ilária & Monica',                      resultado:null },
    { id:8,  data:'2026-06-05', hora:'19:30', campo:'TVCabo',        grupo:'M1-C', eq1:'Ahmad & Uzeir',                    eq2:'Carlos Cardeano & José Santos',        resultado:null },
    { id:9,  data:'2026-06-05', hora:'20:30', campo:'TVCabo',        grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa', eq2:'Frederico Jonet & Francisco Ferreira', resultado:null },
    { id:10, data:'2026-06-05', hora:'21:30', campo:'TVCabo',        grupo:'M2-C', eq1:'Felipe Moniz & José Cossa',        eq2:'Faheem Adamo & Yann Trivellin',        resultado:null },
    // ---- 5 JUN (STELLA ARTOIS) ----
    { id:11, data:'2026-06-05', hora:'17:30', campo:'Stella Artois', grupo:'F2-C', eq1:'Nilda & Lize',                     eq2:'Dalila & Tatiana',                     resultado:null },
    { id:12, data:'2026-06-05', hora:'18:30', campo:'Stella Artois', grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu',eq2:'Luis Antunes & Manuel Neto',           resultado:null },
    { id:13, data:'2026-06-05', hora:'19:30', campo:'Stella Artois', grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',      eq2:'Steph & Ronell',                       resultado:null },
    { id:14, data:'2026-06-05', hora:'20:30', campo:'Stella Artois', grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',     eq2:'Érica Capela & Sarah Taillon',         resultado:null },
    { id:15, data:'2026-06-05', hora:'21:30', campo:'Stella Artois', grupo:'M3-B', eq1:'Shueb & Sahad',                    eq2:'Ugo Gião & Nuno Henriques',            resultado:null },
    // ---- 6 JUN (CAMPO PLAY PADEL) ----
    { id:16, data:'2026-06-06', hora:'07:00', campo:'Play Padel',    grupo:'F2-B', eq1:'Glória & Luciana Lauriano',        eq2:'Paty & Mila',                          resultado:null },
    { id:17, data:'2026-06-06', hora:'08:00', campo:'Play Padel',    grupo:'M2-B', eq1:'Jameel & Tahir',                   eq2:'Dej Cruz & Fabio Damato',              resultado:null },
    { id:18, data:'2026-06-06', hora:'09:00', campo:'Play Padel',    grupo:'F1-A', eq1:'Helen Khumalo & Narcisa Nhamitambo',eq2:'Caironice & Carmen',                  resultado:null },
    { id:19, data:'2026-06-06', hora:'10:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Inês Pires & Daniela Duarte',      eq2:'Celine Sieu & Ana Pezarat',            resultado:null },
    { id:20, data:'2026-06-06', hora:'12:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Marta Botelho & Ana Oliveira',     eq2:'Diana Carvalho & Ilga João',           resultado:null },
    { id:21, data:'2026-06-06', hora:'13:00', campo:'Play Padel',    grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu',eq2:'João Alberty & Manel Alberty',         resultado:null },
    { id:22, data:'2026-06-06', hora:'14:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Anouk Fumane & Letícia',           eq2:'Ohmar Fernandes & Claudia',            resultado:null },
    { id:23, data:'2026-06-06', hora:'15:00', campo:'Play Padel',    grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',              eq2:'Elves & Uweizy',                       resultado:null },
    { id:24, data:'2026-06-06', hora:'16:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Rehan Fayaz & Reehan M.',          eq2:'Naim Hassan & Sidik',                  resultado:null },
    { id:25, data:'2026-06-06', hora:'17:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Rui Lourenço & Francisco Pegado',  eq2:'Shezane Arif & Razeen',                resultado:null },
    { id:26, data:'2026-06-06', hora:'18:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',  eq2:'Gonçalo Nascimento & João Catela',     resultado:null },
    { id:27, data:'2026-06-06', hora:'19:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',               eq2:'Carlos Cardeano & José Santos',        resultado:null },
    { id:28, data:'2026-06-06', hora:'20:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',    eq2:'Sharik Omar & Muhamad Mussagy',        resultado:null },
    { id:29, data:'2026-06-06', hora:'21:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Keiss Chiraze & Saif Issa',        eq2:'Akil & Kalil',                         resultado:null },
    // ---- 6 JUN (TVCABO) ----
    { id:30, data:'2026-06-06', hora:'07:00', campo:'TVCabo',        grupo:'M4-D', eq1:'Jason & Bosch',                    eq2:'Luis Vaz & Sérgio Gomes',              resultado:null },
    { id:31, data:'2026-06-06', hora:'08:00', campo:'TVCabo',        grupo:'F2-B', eq1:'Shanel & Kaitlynn',                eq2:'Karina Darsan & Bethany',              resultado:null },
    { id:32, data:'2026-06-06', hora:'09:00', campo:'TVCabo',        grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',     eq2:'Alcy Heim & Gabriel Heim',             resultado:null },
    { id:33, data:'2026-06-06', hora:'10:00', campo:'TVCabo',        grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',   eq2:'João Henriques & Bruno Morais',        resultado:null },
    { id:34, data:'2026-06-06', hora:'14:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',        eq2:'Faheem Adamo & Yann Trivellin',        resultado:null },
    { id:35, data:'2026-06-06', hora:'15:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Florence & Jinane',                eq2:'Ilária & Monica',                      resultado:null },
    { id:36, data:'2026-06-06', hora:'16:00', campo:'TVCabo',        grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',            eq2:'Filipe Ferreira & Paulo Baldaia',      resultado:null },
    { id:37, data:'2026-06-06', hora:'17:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira',eq2:'Donatella Detto & Julianna',          resultado:null },
    { id:38, data:'2026-06-06', hora:'18:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Stacey & Marlou',                  eq2:'Helen Khumalo & Narcisa Nhamitambo',   resultado:null },
    { id:39, data:'2026-06-06', hora:'19:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Andrea & Mikel Álvarez',           eq2:'Alao Almeida & Ayaan Mussa',           resultado:null },
    // ---- 6 JUN (STELLA ARTOIS) ----
    { id:40, data:'2026-06-06', hora:'07:00', campo:'Stella Artois', grupo:'M3-D', eq1:'Alexandre Salazar & Pedro Gonzalez', eq2:'Gonçalo Marques & Pedro Gonçalves', resultado:null },
    { id:41, data:'2026-06-06', hora:'08:00', campo:'Stella Artois', grupo:'M2-C', eq1:'Felipe Moniz & José Cossa',        eq2:'Ricardo Oliveira & Vasco Silva',       resultado:null },
    { id:42, data:'2026-06-06', hora:'09:00', campo:'Stella Artois', grupo:'M3-A', eq1:'Abdul Ibraimo & Guilherme Godinho',eq2:'Dejan Petrovic & Isidro Simões',       resultado:null },
    { id:43, data:'2026-06-06', hora:'14:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',      eq2:'Nilda & Lize',                         resultado:null },
    { id:44, data:'2026-06-06', hora:'15:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Dalila & Tatiana',                 eq2:'Steph & Ronell',                       resultado:null },
    { id:45, data:'2026-06-06', hora:'16:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Rayhan & Arsheel',                 eq2:'Faheem Aboobakar & Mikaeel Taibo',     resultado:null },
    { id:46, data:'2026-06-06', hora:'17:00', campo:'Stella Artois', grupo:'M3-A', eq1:'José Mestre & Koenraad',           eq2:'Burhan Hassan & Sarfaraz',             resultado:null },
    { id:47, data:'2026-06-06', hora:'18:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                   eq2:'Shiraz & Kheizar',                     resultado:null },
    { id:48, data:'2026-06-06', hora:'19:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Fádhil Khan & Kelyo',              eq2:'Reihan Adamo & Nabil Manga',           resultado:null },
    // ---- 7 JUN (CAMPO PLAY PADEL) ----
    { id:49, data:'2026-06-07', hora:'07:00', campo:'Play Padel',    grupo:'M4-A', eq1:'João Pignatelli & Joel Almeida',   eq2:'Pablo & Galo Rivera',                  resultado:null },
    { id:50, data:'2026-06-07', hora:'08:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',     eq2:'Celine Sieu & Ana Pezarat',            resultado:null },
    { id:51, data:'2026-06-07', hora:'09:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Sharik Omar & Muhamad Mussagy',    eq2:'Akil & Kalil',                         resultado:null },
    { id:52, data:'2026-06-07', hora:'10:00', campo:'Play Padel',    grupo:'M5-A', eq1:'Alcy Heim & Gabriel Heim',         eq2:'Hamdan & Huzeifah',                    resultado:null },
    { id:53, data:'2026-06-07', hora:'11:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Omar Fernandes & Claudia',         eq2:'Diana Carvalho & Ilga João',           resultado:null },
    { id:54, data:'2026-06-07', hora:'12:00', campo:'Play Padel',    grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu',eq2:'Faizal & Sherial',                     resultado:null },
    { id:55, data:'2026-06-07', hora:'13:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Rehan Fayaz & Reehan M.',          eq2:'Gonçalo Nascimento & João Catela',     resultado:null },
    { id:56, data:'2026-06-07', hora:'14:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Frederico Jonet & Francisco Ferreira', eq2:'Shezane Arif & Razeen',           resultado:null },
    { id:57, data:'2026-06-07', hora:'15:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Carlos Cardeano & José Santos',    eq2:'Fernando & Rui Rocha',                 resultado:null },
    { id:58, data:'2026-06-07', hora:'16:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Érica Capela & Sarah Taillon',     eq2:'Inês Pires & Daniela Duarte',          resultado:null },
    { id:59, data:'2026-06-07', hora:'17:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',  eq2:'Naim Hassan & Sidik',                  resultado:null },
    { id:60, data:'2026-06-07', hora:'18:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',               eq2:'Ahmad & Uzeir',                        resultado:null },
    { id:61, data:'2026-06-07', hora:'19:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',    eq2:'Keiss Chiraze & Saif Issa',            resultado:null },
    { id:62, data:'2026-06-07', hora:'20:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa', eq2:'Rui Lourenço & Francisco Pegado', resultado:null },
    // ---- 7 JUN (TVCABO) ----
    { id:63, data:'2026-06-07', hora:'07:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira',eq2:'Ilária & Monica',                     resultado:null },
    { id:64, data:'2026-06-07', hora:'08:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Florence & Jinane',                eq2:'Donatella Detto & Julianna',           resultado:null },
    { id:65, data:'2026-06-07', hora:'09:00', campo:'TVCabo',        grupo:'M3-B', eq1:'Ugo Gião & Nuno Henriques',        eq2:'Edson Uamusse & Salomão',              resultado:null },
    { id:66, data:'2026-06-07', hora:'10:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Stacey & Marlou',                  eq2:'Caironice & Carmen',                   resultado:null },
    { id:67, data:'2026-06-07', hora:'11:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Helen Khumalo & Narcisa Nhamitambo',eq2:'Cynthia Cavalcanti & Kátia Sousa',    resultado:null },
    { id:68, data:'2026-06-07', hora:'12:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Duncan & James',                   eq2:'Andrea & Mikel Álvarez',               resultado:null },
    { id:69, data:'2026-06-07', hora:'13:00', campo:'TVCabo',        grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',              eq2:'Alexandre Salazar & Pedro Gonzalez',   resultado:null },
    { id:70, data:'2026-06-07', hora:'14:00', campo:'TVCabo',        grupo:'M3-D', eq1:'Gonçalo Marques & Pedro Gonçalves',eq2:'Elves & Uweizy',                       resultado:null },
    { id:71, data:'2026-06-07', hora:'15:00', campo:'TVCabo',        grupo:'M3-B', eq1:'Shueb & Sahad',                    eq2:'Edson Uamusse & Salomão',              resultado:null },
    { id:72, data:'2026-06-07', hora:'16:00', campo:'TVCabo',        grupo:'M4-D', eq1:'Jason & Bosch',                    eq2:'Luis Trigo de Morais & Pedro Mandlate',resultado:null },
    { id:73, data:'2026-06-07', hora:'17:00', campo:'TVCabo',        grupo:'F1-C', eq1:'Anouk Fumane & Letícia',           eq2:'Marta Botelho & Ana Oliveira',         resultado:null },
    { id:74, data:'2026-06-07', hora:'18:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Nuno Resende & Gonçalo Bettencourt',eq2:'Alao Almeida & Ayaan Mussa',          resultado:null },
    { id:75, data:'2026-06-07', hora:'19:00', campo:'TVCabo',        grupo:'M3-A', eq1:'Burhan Hassan & Sarfaraz',         eq2:'Dejan Petrovic & Isidro Simões',       resultado:null },
    { id:76, data:'2026-06-07', hora:'20:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',        eq2:'Felipe Moniz & José Cossa',            resultado:null },
    { id:77, data:'2026-06-07', hora:'21:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Faheem Adamo & Yann Trivellin',    eq2:'Ricardo Oliveira & Vasco Silva',       resultado:null },
    // ---- 7 JUN (STELLA ARTOIS) ----
    { id:78, data:'2026-06-07', hora:'07:00', campo:'Stella Artois', grupo:'F2-B', eq1:'Glória & Luciana Lauriano',        eq2:'Karina Darsan & Bethany',              resultado:null },
    { id:79, data:'2026-06-07', hora:'08:00', campo:'Stella Artois', grupo:'F2-B', eq1:'Shanel & Kaitlynn',                eq2:'Paty & Mila',                          resultado:null },
    { id:80, data:'2026-06-07', hora:'09:00', campo:'Stella Artois', grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',   eq2:'Jameel & Tahir',                       resultado:null },
    { id:81, data:'2026-06-07', hora:'10:00', campo:'Stella Artois', grupo:'M2-B', eq1:'João Henriques & Bruno Morais',    eq2:'Dej Cruz & Fabio Damato',              resultado:null },
    { id:82, data:'2026-06-07', hora:'12:00', campo:'Stella Artois', grupo:'M4-D', eq1:'Luis Vaz & Sérgio Gomes',          eq2:'Luis Trigo de Morais & Pedro Mandlate',resultado:null },
    { id:83, data:'2026-06-07', hora:'13:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                   eq2:'Fádhil Khan & Kelyo',                  resultado:null },
    { id:84, data:'2026-06-07', hora:'14:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Shiraz & Kheizar',                 eq2:'Reihan Adamo & Nabil Manga',           resultado:null },
    { id:85, data:'2026-06-07', hora:'15:00', campo:'Stella Artois', grupo:'M4-D', eq1:'Jason & Bosch',                   eq2:'Muhammad Chona & Ibrahim Bilal',        resultado:null },
    { id:86, data:'2026-06-07', hora:'16:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Nilda & Lize',                    eq2:'Steph & Ronell',                        resultado:null },
    { id:87, data:'2026-06-07', hora:'17:00', campo:'Stella Artois', grupo:'M4-A', eq1:'Pablo & Galo Rivera',              eq2:'André Reves & Francisco Morais',        resultado:null },
    { id:88, data:'2026-06-07', hora:'18:00', campo:'Stella Artois', grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',     eq2:'Faizaan Ravat & Ranim Ahmad',           resultado:null },
    { id:89, data:'2026-06-07', hora:'19:00', campo:'Stella Artois', grupo:'M1-A', eq1:'Luis Antunes & Manuel Neto',       eq2:'João Alberty & Manel Alberty',          resultado:null },
    { id:90, data:'2026-06-07', hora:'20:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Filipe Ferreira & Paulo Baldaia',  eq2:'Faheem Aboobakar & Mikaeel Taibo',      resultado:null },
    { id:91, data:'2026-06-07', hora:'21:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',            eq2:'Rayhan & Arsheel',                      resultado:null },
    // ---- 8 JUN ----
    { id:92,  data:'2026-06-08', hora:'17:30', campo:'Play Padel',    grupo:'F1-C', eq1:'Marta Botelho & Ana Oliveira',    eq2:'Ohmar Fernandes & Claudia',             resultado:null },
    { id:93,  data:'2026-06-08', hora:'18:30', campo:'Play Padel',    grupo:'M4-A', eq1:'Joshua & Noah',                   eq2:'João Pignatelli & Joel Almeida',        resultado:null },
    { id:94,  data:'2026-06-08', hora:'19:30', campo:'Play Padel',    grupo:'M1-C', eq1:'Ahmad & Uzeir',                   eq2:'Fernando & Rui Rocha',                  resultado:null },
    { id:95,  data:'2026-06-08', hora:'20:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Ugo Gião & Nuno Henriques',       eq2:'Ivandro Remane & João Peixoto',         resultado:null },
    { id:96,  data:'2026-06-08', hora:'21:30', campo:'Play Padel',    grupo:'M1-A', eq1:'Luis Antunes & Manuel Neto',      eq2:'Faizal & Sherial',                      resultado:null },
    { id:97,  data:'2026-06-08', hora:'17:30', campo:'TVCabo',        grupo:'F2-B', eq1:'Glória & Luciana Lauriano',       eq2:'Shanel & Kaitlynn',                     resultado:null },
    { id:98,  data:'2026-06-08', hora:'18:30', campo:'TVCabo',        grupo:'M5-A', eq1:'Faizan Ravat & Ranim Ahmad',      eq2:'Alcy Heim & Gabriel Heim',              resultado:null },
    { id:99,  data:'2026-06-08', hora:'19:30', campo:'TVCabo',        grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',    eq2:'Inês Pires & Daniela Duarte',           resultado:null },
    { id:100, data:'2026-06-08', hora:'20:30', campo:'TVCabo',        grupo:'M1-A', eq1:'Faizal & Sherial',                eq2:'João Alberty & Manel Alberty',          resultado:null },
    { id:101, data:'2026-06-08', hora:'21:30', campo:'TVCabo',        grupo:'M3-A', eq1:'José Mestre & Koenraad',          eq2:'Abdul Ibraimo & Guilherme Godinho',      resultado:null },
    { id:102, data:'2026-06-08', hora:'17:30', campo:'Stella Artois', grupo:'F2-B', eq1:'Paty & Mila',                    eq2:'Karina Darsan & Bethany',               resultado:null },
    { id:103, data:'2026-06-08', hora:'18:30', campo:'Stella Artois', grupo:'F1-A', eq1:'Caironice & Carmen',              eq2:'Cynthia Cavalcanti & Kátia Sousa',      resultado:null },
    { id:104, data:'2026-06-08', hora:'19:30', campo:'Stella Artois', grupo:'M4-B', eq1:'Duncan & James',                  eq2:'Nuno Resende & Gonçalo Bettencourt',    resultado:null },
    { id:105, data:'2026-06-08', hora:'20:30', campo:'Stella Artois', grupo:'F1-B', eq1:'Érica Capela & Sarah Taillon',    eq2:'Celine Sieu & Ana Pezarat',             resultado:null },
    { id:106, data:'2026-06-08', hora:'21:30', campo:'Stella Artois', grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',    eq2:'Hamdan & Huzeifah',                     resultado:null },
    // ---- 9 JUN ----
    { id:107, data:'2026-06-09', hora:'17:30', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',   eq2:'Akil & Kalil',                          resultado:null },
    { id:108, data:'2026-06-09', hora:'18:30', campo:'Play Padel',    grupo:'M4-A', eq1:'Joshua & Noah',                   eq2:'André Reves & Francisco Morais',        resultado:null },
    { id:109, data:'2026-06-09', hora:'19:30', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',              eq2:'Fernando & Rui Rocha',                  resultado:null },
    { id:110, data:'2026-06-09', hora:'20:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Shueb & Sahad',                   eq2:'Ivandro Remane & João Peixoto',         resultado:null },
    { id:111, data:'2026-06-09', hora:'21:30', campo:'Play Padel',    grupo:'M3-A', eq1:'Burhan Hassan & Sarfaraz',        eq2:'Abdul Ibraimo & Guilherme Godinho',      resultado:null },
    { id:112, data:'2026-06-09', hora:'17:30', campo:'TVCabo',        grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',  eq2:'Dej Cruz & Fabio Damato',               resultado:null },
    { id:113, data:'2026-06-09', hora:'18:30', campo:'TVCabo',        grupo:'M3-A', eq1:'José Mestre & Koenraad',          eq2:'Dejan Petrovic & Isidro Simões',        resultado:null },
    { id:114, data:'2026-06-09', hora:'19:30', campo:'TVCabo',        grupo:'M4-B', eq1:'Andrea & Mikel Álvarez',          eq2:'Nuno Resende & Gonçalo Bettencourt',    resultado:null },
    { id:115, data:'2026-06-09', hora:'20:30', campo:'TVCabo',        grupo:'M5-A', eq1:'Faizan Ravat & Ranim Ahmad',      eq2:'Hamdan & Huzeifah',                     resultado:null },
    { id:116, data:'2026-06-09', hora:'21:30', campo:'TVCabo',        grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa', eq2:'Shezane Arif & Razeen',            resultado:null },
    { id:117, data:'2026-06-09', hora:'17:30', campo:'Stella Artois', grupo:'M2-A', eq1:'Frederico Jonet & Francisco Ferreira', eq2:'Rui Lourenço & Francisco Pegado', resultado:null },
    { id:118, data:'2026-06-09', hora:'18:30', campo:'Stella Artois', grupo:'M3-C', eq1:'Sharik Omar & Muhamad Mussagy',   eq2:'Keiss Chiraze & Saif Issa',             resultado:null },
    { id:119, data:'2026-06-09', hora:'19:30', campo:'Stella Artois', grupo:'F1-C', eq1:'Anouk Fumane & Letícia',          eq2:'Diana Carvalho & Ilga João',            resultado:null },
    { id:120, data:'2026-06-09', hora:'20:30', campo:'Stella Artois', grupo:'M2-B', eq1:'João Henriques & Bruno Morais',   eq2:'Jameel & Tahir',                        resultado:null },
    // ---- 10 JUN ----
    { id:121, data:'2026-06-10', hora:'17:30', campo:'Play Padel',    grupo:'M4-A', eq1:'João Pignatelli & Joel Almeida',  eq2:'André Reves & Francisco Morais',        resultado:null },
    { id:122, data:'2026-06-10', hora:'18:30', campo:'Play Padel',    grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',             eq2:'Gonçalo Marques & Pedro Gonçalves',     resultado:null },
    { id:123, data:'2026-06-10', hora:'19:30', campo:'Play Padel',    grupo:'M3-D', eq1:'Alexandre Salazar & Pedro Gonzalez', eq2:'Elves & Uweizy',                    resultado:null },
    { id:124, data:'2026-06-10', hora:'20:30', campo:'Play Padel',    grupo:'M4-C', eq1:'Shiraz & Kheizar',                eq2:'Fádhil Khan & Kelyo',                   resultado:null },
    { id:125, data:'2026-06-10', hora:'17:30', campo:'TVCabo',        grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',     eq2:'Dalila & Tatiana',                      resultado:null },
    { id:126, data:'2026-06-10', hora:'18:30', campo:'TVCabo',        grupo:'M4-A', eq1:'Joshua & Noah',                   eq2:'Pablo & Galo Rivera',                   resultado:null },
    { id:127, data:'2026-06-10', hora:'19:30', campo:'TVCabo',        grupo:'M5-B', eq1:'Filipe Ferreira & Paulo Baldaia', eq2:'Rayhan & Arsheel',                      resultado:null },
    { id:128, data:'2026-06-10', hora:'20:30', campo:'TVCabo',        grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',           eq2:'Faheem Aboobakar & Mikaeel Taibo',       resultado:null },
    { id:129, data:'2026-06-10', hora:'17:30', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                  eq2:'Reihan Adamo & Nabil Manga',             resultado:null },
    { id:130, data:'2026-06-10', hora:'18:30', campo:'Stella Artois', grupo:'M4-B', eq1:'Duncan & James',                  eq2:'Alao Almeida & Ayaan Mussa',             resultado:null },
    { id:131, data:'2026-06-10', hora:'19:30', campo:'Stella Artois', grupo:'M4-D', eq1:'Muhammad Chona & Ibrahim Bilal',  eq2:'Luis Vaz & Sérgio Gomes',               resultado:null },
    { id:132, data:'2026-06-10', hora:'20:30', campo:'Stella Artois', grupo:'M4-D', eq1:'Muhammad Chona & Ibrahim Bilal',  eq2:'Luis Trigo de Morais & Pedro Mandlate',  resultado:null },
  ],
};

// Storage — delegado para data.js (ppGet / ppSave)

// ============================================
//  AUTENTICAÇÃO (delegado para auth.js)
// ============================================
function isLoggedIn() { return Auth.isAuth(); }

function doLogin(user, pass) {
  const result = Auth.login(user, pass);
  if (!result.ok) { return { ok: false, error: result.error }; }
  return { ok: true };
}

function doLogout() {
  Auth.logout();
  location.reload();
}

// ============================================
//  TOAST
// ============================================
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ============================================
//  MODAL
// ============================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ============================================
//  NAVEGAÇÃO
// ============================================
function navigate(view) {
  APP.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view)?.classList.add('active');

  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === view);
  });

  Auth.updateActivity();

  const titles = {
    dashboard:     ['Dashboard', 'Visão Geral'],
    campos:        ['Campos', 'Gestão de Campos'],
    categorias:    ['Categorias & Grupos', 'Estrutura do Torneio'],
    jogadores:     ['Jogadores', 'Participantes'],
    jogos:         ['Jogos', 'Calendário Completo'],
    resultados:    ['Resultados', 'Lançamento de Resultados'],
    fasefinal:     ['Fase Final', 'Eliminatórias'],
    utilizadores:  ['Utilizadores', 'Gestão de Acessos'],
    logs:          ['Logs de Auditoria', 'Auditoria'],
    sessoes:       ['Sessões Activas', 'Utilizadores Ligados'],
    classificacoes:['Classificações', 'Standings ao Vivo'],
    estatisticas:  ['Estatísticas', 'Resumo do Torneio'],
    importar:      ['Importar Resultados', 'Import em Lote'],
    horario:       ['Construtor de Horário', 'Vista de Agenda'],
  };
  const [title, tag] = titles[view] || [view, ''];
  document.getElementById('breadcrumbTitle').textContent = title;
  document.getElementById('breadcrumbTag').textContent   = tag;

  renderView(view);

  // fechar drawer mobile
  document.getElementById('sidebar').classList.remove('open');
}

// ============================================
//  RENDER VIEWS
// ============================================
function renderView(view) {
  switch (view) {
    case 'dashboard':    renderDashboard();    break;
    case 'campos':       renderCampos();       break;
    case 'categorias':   renderCategorias();   break;
    case 'jogadores':    renderJogadores();    break;
    case 'jogos':        renderJogos();        break;
    case 'resultados':   renderResultados();   break;
    case 'fasefinal':    renderFaseFinal();    break;
    case 'utilizadores': renderUtilizadores(); break;
    case 'logs':         renderLogs();         break;
    case 'sessoes':      renderSessoes();      break;
    case 'classificacoes': renderAdminClassificacoes(); break;
    case 'estatisticas': renderEstatisticas(); break;
    case 'importar':     renderImportar();     break;
    case 'horario':      renderHorario();      break;
  }
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const jogos  = getData('jogos');
  const ff     = ffLoad();

  // Collect all FF jogos across all categories
  const ffJogos = Object.entries(ff).flatMap(([catId, catData]) =>
    (catData?.jogos || []).map(j => ({ ...j, _cat: catId }))
  );

  const totalGrupos  = jogos.length;
  const comResGrupos = jogos.filter(j => j.resultado).length;
  const totalFF      = ffJogos.length;
  const comResFF     = ffJogos.filter(j => j.resultado).length;

  const total  = totalGrupos + totalFF;
  const comRes = comResGrupos + comResFF;
  const semRes = total - comRes;
  const pct    = total ? Math.round(comRes / total * 100) : 0;

  document.getElementById('dashTotalJogos').textContent   = total;
  document.getElementById('dashComResultado').textContent  = comRes;
  document.getElementById('dashPendentes').textContent     = semRes;
  document.getElementById('dashProgresso').textContent     = pct + '%';

  // Próximos jogos pendentes: group stage first, then FF (only where both teams known)
  const proximosGrupos = jogos.filter(j => !j.resultado).slice(0, 6);
  const proximosFF     = ffJogos.filter(j => !j.resultado && j.eq1 && j.eq2);
  const proximos       = [...proximosGrupos, ...proximosFF].slice(0, 6);

  const tbody = document.getElementById('dashProximosBody');
  tbody.innerHTML = proximos.map(j => {
    const isFF = !!j._cat;
    if (isFF) {
      const fLabel = j.fase === 'F' ? 'Final' : j.fase === 'SF' ? `SF ${j.num}` : `QF ${j.num}`;
      return `
        <tr>
          <td><span class="badge badge-cinza">Fase Final</span></td>
          <td>—</td>
          <td>—</td>
          <td><span class="cat-pill cat-${j._cat}">${j._cat} · ${fLabel}</span></td>
          <td style="max-width:220px">${j.eq1}</td>
          <td style="color:var(--cinza-texto);padding:0 0.4rem">VS</td>
          <td style="max-width:220px">${j.eq2}</td>
          <td><span class="badge badge-amarelo">Pendente</span></td>
        </tr>`;
    }
    return `
      <tr>
        <td><span class="td-mono">${formatDate(j.data)}</span></td>
        <td>${j.hora}</td>
        <td><span class="badge badge-cinza">${j.campo}</span></td>
        <td><span class="cat-pill cat-${j.grupo.split('-')[0]}">${j.grupo}</span></td>
        <td style="max-width:220px">${j.eq1}</td>
        <td style="color:var(--cinza-texto);padding:0 0.4rem">VS</td>
        <td style="max-width:220px">${j.eq2}</td>
        <td><span class="badge badge-amarelo">Pendente</span></td>
      </tr>`;
  }).join('');

  // Category progress bars
  const CATS = ['M1','M2','M3','M4','M5','F1','F2'];
  const catProgress = document.getElementById('dashCatProgress');
  if (catProgress) {
    catProgress.innerHTML = CATS.map(cat => {
      const catJogos = jogos.filter(j => j.grupo.startsWith(cat + '-'));
      const done = catJogos.filter(j => j.resultado).length;
      const total = catJogos.length;
      const pct = total ? Math.round(done / total * 100) : 0;
      return `<div class="progress-bar-wrap">
        <span class="progress-bar-label">${cat}</span>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <span class="progress-bar-pct">${pct}%</span>
        <span style="font-size:.68rem;color:var(--cinza-texto);width:4rem;text-align:right">${done}/${total}</span>
      </div>`;
    }).join('');
  }

  // Activity feed from audit log
  const feed = document.getElementById('dashActivityFeed');
  if (feed) {
    const logs = Auth.getLogs().slice(0, 12);
    if (!logs.length) {
      feed.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--cinza-texto);font-size:.8rem">Sem actividade registada.</div>`;
    } else {
      const dotClass = { LOGIN:'', LOGOUT:'activity-dot--warn', SAVE_RESULT:'', SAVE_RESULT_FF:'',
        GENERATE_BRACKET:'', RESET_BRACKET:'activity-dot--err', DELETE_USER:'activity-dot--err',
        FORCE_LOGOUT:'activity-dot--err', CLEAR_RESULT:'activity-dot--warn' };
      feed.innerHTML = logs.map(l => {
        const dc = dotClass[l.action] || '';
        const ago = _timeAgo(l.ts);
        return `<div class="activity-item">
          <span class="activity-dot ${dc}"></span>
          <span class="activity-text"><strong>${escHtml(l.username)}</strong> — ${escHtml(l.detail || l.action)}</span>
          <span class="activity-time">${ago}</span>
        </div>`;
      }).join('');
    }
  }
}

function _timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
}

function updateAlertBanner() {
  const jogos = getData('jogos');
  const pending = jogos.filter(j => !j.resultado).length;
  const banner = document.getElementById('alertBanner');
  const msg    = document.getElementById('alertBannerMsg');
  if (!banner || !msg) return;
  if (pending > 20) {
    msg.textContent = `${pending} jogos ainda sem resultado. Actualize o mais rapidamente possível.`;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ---------- CAMPOS ----------
function renderCampos() {
  const campos = getData('campos');
  const jogos  = getData('jogos');
  const grid   = document.getElementById('camposGrid');
  grid.innerHTML = campos.map(c => {
    const nJogos = jogos.filter(j => j.campo === c.nome).length;
    return `
    <div class="campo-card">
      <div class="campo-card-icon">${c.icone}</div>
      <div class="campo-card-name">${c.nome}</div>
      <p class="campo-card-stat">
        <strong>${nJogos}</strong> jogos · Estado: ${c.activo ? '<span class="badge badge-verde">Activo</span>' : '<span class="badge badge-cinza">Inactivo</span>'}
      </p>
      <div class="campo-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="editCampo(${c.id})">
          <i class="ph ph-pencil"></i> Editar
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteCampo(${c.id})">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    </div>`;
  }).join('');
}

window.editCampo = function(id) {
  const campos = getData('campos');
  const c = campos.find(x => x.id === id);
  if (!c) return;
  APP.editingId = id;
  document.getElementById('campoNome').value  = c.nome;
  document.getElementById('campoIcone').value = c.icone;
  document.getElementById('modalCampoTitle').textContent = 'Editar Campo';
  openModal('modalCampo');
};

window.deleteCampo = function(id) {
  if (!confirm('Eliminar este campo?')) return;
  const campos = getData('campos').filter(c => c.id !== id);
  setData('campos', campos);
  renderCampos();
  Auth.log('DELETE_CAMPO', 'campos', `Campo id=${id} eliminado`);
  toast('Campo eliminado.');
};

function saveCampo() {
  const nome  = document.getElementById('campoNome').value.trim();
  const icone = document.getElementById('campoIcone').value.trim() || '🎾';
  if (!nome) return toast('Preencha o nome do campo.', 'error');

  const campos = getData('campos');
  if (APP.editingId) {
    const idx = campos.findIndex(c => c.id === APP.editingId);
    if (idx >= 0) { campos[idx].nome = nome; campos[idx].icone = icone; }
  } else {
    const newId = Math.max(0, ...campos.map(c => c.id)) + 1;
    campos.push({ id: newId, nome, icone, activo: true });
  }
  setData('campos', campos);
  closeModal('modalCampo');
  renderCampos();
  populateCampoSelects();
  Auth.log(APP.editingId ? 'UPDATE_CAMPO' : 'CREATE_CAMPO', 'campos', `Campo: ${nome}`);
  toast(APP.editingId ? 'Campo actualizado.' : 'Campo adicionado.');
  APP.editingId = null;
}

// ---------- CATEGORIAS & GRUPOS ----------
function renderCategorias() {
  const cats   = getData('categorias');
  const grupos = getData('grupos');

  document.getElementById('catsTableBody').innerHTML = cats.map(c => {
    const nGrupos = grupos.filter(g => g.cat === c.id).length;
    return `
    <tr>
      <td><span class="cat-pill cat-${c.id}">${c.id}</span></td>
      <td class="td-mono">${c.nome}</td>
      <td><span class="badge ${c.tipo==='F' ? 'badge-amarelo':'badge-azul'}">${c.tipo === 'F' ? 'Feminino':'Masculino'}</span></td>
      <td>${nGrupos} grupos</td>
      <td>
        <div style="display:flex;gap:0.4rem">
          ${grupos.filter(g=>g.cat===c.id).map(g=>`<span class="badge badge-cinza">${g.letra}</span>`).join('')}
          <button class="btn-icon btn-edit" onclick="addGrupo('${c.id}')" title="Adicionar grupo"><i class="ph ph-plus"></i></button>
        </div>
      </td>
      <td>
        <div style="display:flex;gap:0.3rem">
          <button class="btn-icon btn-del" onclick="deleteGruposAll('${c.id}')" title="Apagar categoria"><i class="ph ph-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

window.addGrupo = function(catId) {
  const letra = prompt(`Nova letra de grupo para ${catId} (ex: D, E...):`);
  if (!letra) return;
  const grupos = getData('grupos');
  const id = `${catId}-${letra.toUpperCase()}`;
  if (grupos.find(g => g.id === id)) return toast('Grupo já existe.', 'error');
  grupos.push({ id, cat: catId, letra: letra.toUpperCase() });
  setData('grupos', grupos);
  renderCategorias();
  toast(`Grupo ${id} adicionado.`);
};

window.deleteGruposAll = function(catId) {
  if (!confirm(`Eliminar categoria ${catId} e todos os seus grupos?`)) return;
  const cats = getData('categorias').filter(c => c.id !== catId);
  const grupos = getData('grupos').filter(g => g.cat !== catId);
  setData('categorias', cats); setData('grupos', grupos);
  renderCategorias(); toast('Categoria eliminada.');
};

// ---------- JOGADORES ----------
function renderJogadores(filter = '') {
  const jogos = getData('jogos');
  // Extrair todos os nomes únicos dos pares
  const setJogadores = new Set();
  jogos.forEach(j => {
    j.eq1.split('&').forEach(n => setJogadores.add(n.trim()));
    j.eq2.split('&').forEach(n => setJogadores.add(n.trim()));
  });
  let lista = [...setJogadores].sort();
  if (filter) lista = lista.filter(n => n.toLowerCase().includes(filter.toLowerCase()));

  const tbody = document.getElementById('jogadoresBody');
  tbody.innerHTML = lista.map((nome, i) => {
    const jogosJogador = jogos.filter(j => j.eq1.includes(nome) || j.eq2.includes(nome));
    const grupos = [...new Set(jogosJogador.map(j => j.grupo))];
    const comRes  = jogosJogador.filter(j => j.resultado).length;
    const nomeEnc = encodeURIComponent(nome);
    return `
    <tr>
      <td style="color:var(--cinza-texto);font-size:0.75rem">${i+1}</td>
      <td><strong>${nome}</strong></td>
      <td>${grupos.map(g=>`<span class="cat-pill cat-${g.split('-')[0]}">${g}</span>`).join(' ')}</td>
      <td>${jogosJogador.length} <span class="td-muted">jogo${jogosJogador.length!==1?'s':''}</span></td>
      <td>${comRes} <span class="td-muted">result.</span></td>
      <td><button class="btn-icon" onclick="editarJogador(decodeURIComponent('${nomeEnc}'))" title="Editar nome"><i class="ph ph-pencil"></i></button></td>
    </tr>`;
  }).join('');

  document.getElementById('jogadoresCount').textContent = lista.length;
}

function editarJogador(nome) {
  document.getElementById('jogadorNomeActual').textContent = nome;
  document.getElementById('jogadorNomeNovo').value = nome;
  APP.editingId = nome;
  openModal('modalJogador');
  setTimeout(() => {
    const inp = document.getElementById('jogadorNomeNovo');
    inp.focus();
    inp.select();
  }, 120);
}

function saveJogador() {
  const nomeAntigo = APP.editingId;
  const nomeNovo   = document.getElementById('jogadorNomeNovo').value.trim();
  if (!nomeNovo) { toast('Introduza o novo nome', 'error'); return; }
  if (nomeNovo === nomeAntigo) { closeModal('modalJogador'); return; }

  const jogos = getData('jogos');
  let alterados = 0;
  jogos.forEach(j => {
    const eq1parts = j.eq1.split('&').map(n => n.trim());
    const eq2parts = j.eq2.split('&').map(n => n.trim());
    const idx1 = eq1parts.indexOf(nomeAntigo);
    const idx2 = eq2parts.indexOf(nomeAntigo);
    if (idx1 !== -1) { eq1parts[idx1] = nomeNovo; j.eq1 = eq1parts.join(' & '); alterados++; }
    if (idx2 !== -1) { eq2parts[idx2] = nomeNovo; j.eq2 = eq2parts.join(' & '); alterados++; }
  });
  setData('jogos', jogos);
  closeModal('modalJogador');
  Auth.log('RENAME_JOGADOR', 'jogadores', `"${nomeAntigo}" → "${nomeNovo}"`);
  toast(`"${nomeAntigo}" renomeado para "${nomeNovo}" em ${alterados} jogo${alterados!==1?'s':''}`, 'success');
  renderJogadores();
  APP.editingId = null;
}

// ---------- JOGOS ----------
function matchSetsScore(r) {
  let w1 = 0, w2 = 0;
  if (r.s1eq1 > r.s1eq2) w1++; else w2++;
  if (r.s2eq1 !== null) { if (r.s2eq1 > r.s2eq2) w1++; else w2++; }
  if (r.s3eq1 !== null) { if (r.s3eq1 > r.s3eq2) w1++; else w2++; }
  return { w1, w2 };
}

function renderJogos(filtroData = 'todos', filtroCampo = 'todos', filtroGrupo = 'todos') {
  let jogos = getData('jogos');

  if (filtroData !== 'todos')   jogos = jogos.filter(j => j.data === filtroData);
  if (filtroCampo !== 'todos')  jogos = jogos.filter(j => j.campo === filtroCampo);
  if (filtroGrupo !== 'todos')  jogos = jogos.filter(j => j.grupo === filtroGrupo);

  const tbody = document.getElementById('jogosBody');
  tbody.innerHTML = jogos.map(j => {
    const cat = j.grupo.split('-')[0];
    const resHtml = j.resultado
      ? (() => {
          const { w1, w2 } = matchSetsScore(j.resultado);
          const r = j.resultado;
          const sets = [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
            .filter(([a])=>a!==null).map(([a,b])=>`${a}-${b}`).join(' / ');
          return `<span class="score-display" title="${sets}" style="display:inline-flex;align-items:center;gap:.3rem">
            <span style="font-size:.85rem;font-weight:700;color:var(--branco)">${w1}</span>
            <span class="sd">–</span>
            <span style="font-size:.85rem;font-weight:700;color:var(--branco)">${w2}</span>
            <span style="font-size:.65rem;color:var(--cinza-texto);letter-spacing:.05em">sets</span>
          </span>`;
        })()
      : `<span class="badge badge-amarelo">Pendente</span>`;

    return `
    <tr>
      <td class="td-mono" style="color:var(--cinza-texto)">${j.id}</td>
      <td><span class="td-mono">${formatDate(j.data)}</span></td>
      <td>${j.hora}</td>
      <td><span class="badge badge-cinza" style="font-size:0.65rem">${j.campo}</span></td>
      <td><span class="cat-pill cat-${cat}">${j.grupo}</span></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.eq1}</td>
      <td style="text-align:center;color:var(--cinza-texto);font-size:0.7rem">VS</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.eq2}</td>
      <td style="text-align:center">${resHtml}</td>
      <td>
        <div style="display:flex;gap:0.3rem">
          <button class="btn-icon btn-edit" title="Lançar resultado" onclick="abrirResultado(${j.id})"><i class="ph ph-pencil-simple"></i></button>
          <button class="btn-icon btn-del"  title="Eliminar jogo"    onclick="deleteJogo(${j.id})"><i class="ph ph-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('jogosCount').textContent = jogos.length;
}

window.deleteJogo = function(id) {
  if (!confirm('Eliminar este jogo?')) return;
  const jogos = getData('jogos').filter(j => j.id !== id);
  setData('jogos', jogos);
  renderJogos();
  toast('Jogo eliminado.');
};

// ---------- TESTES: RESULTADOS ALEATÓRIOS ----------
function randomSet() {
  const validScores = [[6,0],[6,1],[6,2],[6,3],[6,4],[7,5]];
  const useTb = Math.random() < 0.15;
  let eq1, eq2, tbEq1 = null, tbEq2 = null;
  if (useTb) {
    const tbOptions = [[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[8,6],[9,7],[10,8]];
    const tb = tbOptions[Math.floor(Math.random() * tbOptions.length)];
    eq1 = 7; eq2 = 6; tbEq1 = tb[0]; tbEq2 = tb[1];
  } else {
    const s = validScores[Math.floor(Math.random() * validScores.length)];
    eq1 = s[0]; eq2 = s[1];
  }
  if (Math.random() < 0.5) return { eq1: eq2, eq2: eq1, tbEq1: tbEq2, tbEq2: tbEq1 };
  return { eq1, eq2, tbEq1, tbEq2 };
}

window.gerarResultadosAleatorios = function() {
  if (!confirm('Preencher todos os jogos pendentes com resultados aleatórios?\n(Apenas para testes — os resultados existentes não são alterados.)')) return;
  const jogos = getData('jogos');
  let count = 0;
  jogos.forEach(j => {
    if (j.resultado) return;
    const s1 = randomSet(), s2 = randomSet();
    const w1 = s1.eq1 > s1.eq2 ? 1 : 2;
    const w2 = s2.eq1 > s2.eq2 ? 1 : 2;
    const resultado = {
      s1eq1: s1.eq1, s1eq2: s1.eq2, tb1eq1: s1.tbEq1, tb1eq2: s1.tbEq2,
      s2eq1: s2.eq1, s2eq2: s2.eq2, tb2eq1: s2.tbEq1, tb2eq2: s2.tbEq2,
      s3eq1: null,   s3eq2: null,   tb3eq1: null,      tb3eq2: null,
    };
    if (w1 !== w2) {
      const s3 = randomSet();
      resultado.s3eq1 = s3.eq1; resultado.s3eq2 = s3.eq2;
      resultado.tb3eq1 = s3.tbEq1; resultado.tb3eq2 = s3.tbEq2;
    }
    j.resultado = resultado;
    count++;
  });
  setData('jogos', jogos);
  renderView(APP.currentView);
  toast(`${count} resultados aleatórios gerados.`);
};

window.limparTodosResultados = function() {
  if (!confirm('Limpar TODOS os resultados do torneio?\nEsta acção não pode ser desfeita.')) return;
  const jogos = getData('jogos').map(j => ({ ...j, resultado: null }));
  setData('jogos', jogos);
  renderView(APP.currentView);
  toast('Todos os resultados foram removidos.');
};

// ---------- RESULTADOS ----------
function renderResultados(filtroData = 'todos') {
  let jogos = getData('jogos').filter(j => !j.resultado);
  if (filtroData !== 'todos') jogos = jogos.filter(j => j.data === filtroData);

  const tbody = document.getElementById('resultadosBody');
  tbody.innerHTML = jogos.map(j => {
    const cat = j.grupo.split('-')[0];
    return `
    <tr>
      <td><span class="td-mono">${formatDate(j.data)}</span> ${j.hora}</td>
      <td><span class="badge badge-cinza" style="font-size:0.65rem">${j.campo}</span></td>
      <td><span class="cat-pill cat-${cat}">${j.grupo}</span></td>
      <td>${j.eq1}</td>
      <td style="text-align:center;color:var(--cinza-texto)">VS</td>
      <td>${j.eq2}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="abrirResultado(${j.id})">
          <i class="ph ph-pencil-simple"></i> Resultado
        </button>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('resultadosPendentes').textContent = jogos.length;
}

// ---------- LANÇAR RESULTADO ----------

// Returns 1 or 2 if set n has a valid winner, else 0
function getSetWinner(n) {
  const e1v = document.getElementById(`resS${n}E1`)?.value ?? '';
  const e2v = document.getElementById(`resS${n}E2`)?.value ?? '';
  if (e1v === '' || e2v === '') return 0;
  const a = parseInt(e1v), b = parseInt(e2v);
  if (isNaN(a) || isNaN(b)) return 0;
  if (a === 6 && b === 6) {
    const tv1 = document.getElementById(`resTB${n}E1`)?.value ?? '';
    const tv2 = document.getElementById(`resTB${n}E2`)?.value ?? '';
    if (tv1 === '' || tv2 === '') return 0;
    const ta = parseInt(tv1), tb = parseInt(tv2);
    if (isNaN(ta) || isNaN(tb) || ta === tb) return 0;
    const hi = Math.max(ta, tb), lo = Math.min(ta, tb);
    if (hi < 7 || hi - lo < 2) return 0;
    return ta > tb ? 1 : 2;
  }
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if ((hi === 6 && lo <= 4) || (hi === 7 && lo === 5)) return a > b ? 1 : 2;
  return 0;
}

function clearSetInputs(n) {
  ['E1','E2'].forEach(s => { const el = document.getElementById(`resS${n}${s}`); if (el) el.value = ''; });
  ['E1','E2'].forEach(s => { const el = document.getElementById(`resTB${n}${s}`); if (el) el.value = ''; });
  const tbRow = document.getElementById(`tbRow${n}`); if (tbRow) tbRow.style.display = 'none';
  const st = document.getElementById(`setStatus${n}`); if (st) { st.textContent = ''; st.className = 'set-status'; }
}

function updateMatchResultBar() {
  const bar = document.getElementById('matchResultBar');
  if (!bar) return;
  const s1w = getSetWinner(1), s2w = getSetWinner(2), s3w = getSetWinner(3);
  const wins1 = [s1w, s2w, s3w].filter(w => w === 1).length;
  const wins2 = [s1w, s2w, s3w].filter(w => w === 2).length;
  if (wins1 >= 2 || wins2 >= 2) {
    const name = wins1 >= 2
      ? document.getElementById('resTeam1').textContent
      : document.getElementById('resTeam2').textContent;
    bar.className = 'match-result-bar match-result-bar--win';
    bar.textContent = '🏆 Vence: ' + name;
    bar.style.display = '';
  } else if (s1w && s2w && s1w !== s2w) {
    bar.className = 'match-result-bar match-result-bar--pending';
    bar.textContent = '1-1 → joga-se o 3.º set';
    bar.style.display = '';
  } else {
    bar.style.display = 'none';
  }
}

window.onSetInput = function(n) {
  const e1v = document.getElementById(`resS${n}E1`).value;
  const e2v = document.getElementById(`resS${n}E2`).value;
  const tbRow = document.getElementById(`tbRow${n}`);
  const statusEl = document.getElementById(`setStatus${n}`);

  if (e1v !== '' && e2v !== '') {
    const a = parseInt(e1v), b = parseInt(e2v);
    if (a === 6 && b === 6) {
      tbRow.style.display = '';
      statusEl.className = 'set-status set-status--tie';
      statusEl.textContent = '6-6 → TB';
    } else {
      tbRow.style.display = 'none';
      document.getElementById(`resTB${n}E1`).value = '';
      document.getElementById(`resTB${n}E2`).value = '';
      const w = getSetWinner(n);
      if (w) {
        statusEl.className = 'set-status set-status--ok'; statusEl.textContent = '✓';
      } else {
        statusEl.className = 'set-status set-status--err'; statusEl.textContent = 'Inválido';
      }
    }
  } else {
    tbRow.style.display = 'none';
    statusEl.textContent = ''; statusEl.className = 'set-status';
  }

  // Cascade set visibility
  const s1w = getSetWinner(1);
  const set2Block = document.getElementById('setBlock2');
  if (!s1w) {
    set2Block.style.display = 'none'; clearSetInputs(2);
    document.getElementById('setBlock3').style.display = 'none'; clearSetInputs(3);
    document.getElementById('matchResultBar').style.display = 'none';
    return;
  }
  set2Block.style.display = '';
  const s2w = getSetWinner(2);
  const set3Block = document.getElementById('setBlock3');
  if (s2w) {
    if (s1w !== s2w) { set3Block.style.display = ''; }
    else { set3Block.style.display = 'none'; clearSetInputs(3); }
  } else {
    set3Block.style.display = 'none';
  }
  updateMatchResultBar();
};

window.abrirResultado = function(jogoId) {
  const jogos = getData('jogos');
  const j = jogos.find(x => x.id === jogoId);
  if (!j) return;

  APP.editingId = jogoId;
  document.getElementById('resMatchInfo').textContent = `${formatDate(j.data)} · ${j.hora} · ${j.campo} · ${j.grupo}`;
  document.getElementById('resTeam1').textContent = j.eq1;
  document.getElementById('resTeam2').textContent = j.eq2;

  // Reset all inputs and visibility
  [1, 2, 3].forEach(n => clearSetInputs(n));
  [2, 3].forEach(n => { document.getElementById(`setBlock${n}`).style.display = 'none'; });
  document.getElementById('matchResultBar').style.display = 'none';

  const r = j.resultado;
  if (r) {
    function loadSet(n, eq1, eq2, tbEq1, tbEq2) {
      const isTbSet = (eq1 === 7 && eq2 === 6) || (eq1 === 6 && eq2 === 7);
      document.getElementById(`resS${n}E1`).value = isTbSet ? 6 : eq1;
      document.getElementById(`resS${n}E2`).value = isTbSet ? 6 : eq2;
      if (isTbSet && tbEq1 != null) {
        document.getElementById(`resTB${n}E1`).value = tbEq1;
        document.getElementById(`resTB${n}E2`).value = tbEq2;
      }
    }
    loadSet(1, r.s1eq1, r.s1eq2, r.tb1eq1, r.tb1eq2);
    if (r.s2eq1 !== null) loadSet(2, r.s2eq1, r.s2eq2, r.tb2eq1, r.tb2eq2);
    if (r.s3eq1 !== null) loadSet(3, r.s3eq1, r.s3eq2, r.tb3eq1, r.tb3eq2);
  }

  // Trigger UI cascade
  onSetInput(1);
  if (r?.s2eq1 !== null) onSetInput(2);
  if (r?.s3eq1 !== null) onSetInput(3);

  openModal('modalResultado');
};

function salvarResultado() {
  const s1e1 = document.getElementById('resS1E1').value;
  const s1e2 = document.getElementById('resS1E2').value;
  if (s1e1 === '' || s1e2 === '') return toast('Introduza pelo menos o resultado do 1.º set.', 'error');
  if (!getSetWinner(1)) return toast('Resultado do 1.º set inválido. Scores válidos: 6-0 a 6-4, 7-5, ou 6-6 + tie-break.', 'error');

  const set2Visible = document.getElementById('setBlock2').style.display !== 'none';
  const set3Visible = document.getElementById('setBlock3').style.display !== 'none';

  if (set2Visible) {
    const v2 = document.getElementById('resS2E1').value;
    if (v2 !== '' && !getSetWinner(2)) return toast('Resultado do 2.º set inválido.', 'error');
  }
  if (set3Visible) {
    const v3 = document.getElementById('resS3E1').value;
    if (v3 !== '' && !getSetWinner(3)) return toast('Resultado do 3.º set inválido.', 'error');
  }

  // Determine winners and check match has a winner
  const s1w = getSetWinner(1), s2w = getSetWinner(2), s3w = getSetWinner(3);
  const wins1 = [s1w, s2w, s3w].filter(w => w === 1).length;
  const wins2 = [s1w, s2w, s3w].filter(w => w === 2).length;
  if (wins1 < 2 && wins2 < 2) return toast('O jogo ainda não tem vencedor. Introduza os sets em falta.', 'error');

  // Build set data (convert 6-6+TB → 7-6 for storage)
  function buildSet(n) {
    const e1v = document.getElementById(`resS${n}E1`).value;
    const e2v = document.getElementById(`resS${n}E2`).value;
    if (e1v === '' || e2v === '') return null;
    const a = parseInt(e1v), b = parseInt(e2v);
    if (a === 6 && b === 6) {
      const ta = parseInt(document.getElementById(`resTB${n}E1`).value);
      const tb = parseInt(document.getElementById(`resTB${n}E2`).value);
      return { eq1: ta > tb ? 7 : 6, eq2: ta > tb ? 6 : 7, tbEq1: ta, tbEq2: tb };
    }
    return { eq1: a, eq2: b, tbEq1: null, tbEq2: null };
  }

  const set1 = buildSet(1);
  const set2 = set2Visible ? buildSet(2) : null;
  const set3 = set3Visible ? buildSet(3) : null;

  const resultado = {
    s1eq1: set1.eq1, s1eq2: set1.eq2, tb1eq1: set1.tbEq1, tb1eq2: set1.tbEq2,
    s2eq1: set2 ? set2.eq1 : null, s2eq2: set2 ? set2.eq2 : null, tb2eq1: set2 ? set2.tbEq1 : null, tb2eq2: set2 ? set2.tbEq2 : null,
    s3eq1: set3 ? set3.eq1 : null, s3eq2: set3 ? set3.eq2 : null, tb3eq1: set3 ? set3.tbEq1 : null, tb3eq2: set3 ? set3.tbEq2 : null,
  };

  // Fase Final game
  if (APP.ffEditing) {
    const { catId, jogoId } = APP.ffEditing;
    const ff = ffLoad();
    const jIdx = ff[catId]?.jogos.findIndex(j => j.id === jogoId);
    if (jIdx >= 0) { ff[catId].jogos[jIdx].resultado = resultado; ffSave(ff); ffPropagate(catId); }
    closeModal('modalResultado');
    renderView(APP.currentView);
    Auth.log('SAVE_RESULT_FF', 'fasefinal', `Resultado FF: ${catId} jogo ${jogoId}`);
    toast('Resultado guardado.');
    APP.ffEditing = null;
    return;
  }

  // Fase de grupos
  const jogos = getData('jogos');
  const idx = jogos.findIndex(j => j.id === APP.editingId);
  if (idx < 0) return;
  jogos[idx].resultado = resultado;
  setData('jogos', jogos);
  closeModal('modalResultado');
  renderView(APP.currentView);
  Auth.log('SAVE_RESULT', 'resultados', `Resultado guardado: jogo #${APP.editingId}`);
  toast(`Resultado guardado para o jogo #${APP.editingId}.`);
  APP.editingId = null;
}

function limparResultado() {
  if (!APP.editingId) return;
  if (!confirm('Limpar o resultado deste jogo?')) return;
  const jogos = getData('jogos');
  const idx = jogos.findIndex(j => j.id === APP.editingId);
  if (idx >= 0) { jogos[idx].resultado = null; setData('jogos', jogos); }
  closeModal('modalResultado');
  renderView(APP.currentView);
  Auth.log('CLEAR_RESULT', 'resultados', `Resultado removido: jogo #${APP.editingId}`);
  toast('Resultado removido.');
  APP.editingId = null;
}

// ============================================
//  UTILITÁRIOS
// ============================================
// formatDate delegado para ppFormatDate em data.js

function populateCampoSelects() {
  const campos = getData('campos');
  const opts = `<option value="todos">Todos os campos</option>` +
    campos.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
  document.querySelectorAll('.filter-campo').forEach(s => { s.innerHTML = opts; });
}

function populateDataSelects() {
  const jogos = getData('jogos');
  const datas = [...new Set(jogos.map(j => j.data))].sort();
  const opts = `<option value="todos">Todas as datas</option>` +
    datas.map(d => `<option value="${d}">${formatDateFull(d)}</option>`).join('');
  document.querySelectorAll('.filter-data').forEach(s => { s.innerHTML = opts; });
}

function formatDateFull(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('pt-PT', { weekday:'short', day:'numeric', month:'short' });
}

// ============================================
//  NOVO JOGO (modal)
// ============================================
function abrirNovoJogo() {
  APP.editingId = null;
  document.getElementById('jogoData').value = '';
  document.getElementById('jogoHora').value = '';
  document.getElementById('jogoGrupo').value = '';
  document.getElementById('jogoEq1').value   = '';
  document.getElementById('jogoEq2').value   = '';
  // popular campo select
  const campos = getData('campos');
  document.getElementById('jogoCampo').innerHTML =
    campos.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
  // popular grupo select
  const grupos = getData('grupos');
  document.getElementById('jogoGrupo').innerHTML =
    grupos.map(g => `<option value="${g.id}">${g.id}</option>`).join('');
  openModal('modalJogo');
}

function salvarJogo() {
  const data  = document.getElementById('jogoData').value;
  const hora  = document.getElementById('jogoHora').value;
  const campo = document.getElementById('jogoCampo').value;
  const grupo = document.getElementById('jogoGrupo').value;
  const eq1   = document.getElementById('jogoEq1').value.trim();
  const eq2   = document.getElementById('jogoEq2').value.trim();

  if (!data || !hora || !campo || !grupo || !eq1 || !eq2)
    return toast('Preencha todos os campos do jogo.', 'error');

  const jogos = getData('jogos');
  const newId = Math.max(0, ...jogos.map(j => j.id)) + 1;
  jogos.push({ id: newId, data, hora, campo, grupo, eq1, eq2, resultado: null });
  setData('jogos', jogos);
  closeModal('modalJogo');
  renderView(APP.currentView);
  populateDataSelects();
  toast(`Jogo #${newId} adicionado.`);
}

// ============================================
//  INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {

  // Login
  const loginForm = document.getElementById('loginForm');
  Auth.ensureDefaults();

  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      const u = document.getElementById('loginUser').value.trim();
      const p = document.getElementById('loginPass').value;
      const result = doLogin(u, p);
      if (result.ok) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminShell').classList.add('visible');
        initAdmin();
      } else {
        const errEl = document.getElementById('loginError');
        errEl.style.display = 'flex';
        errEl.innerHTML = `<i class="ph ph-warning-circle"></i> ${result.error}`;
      }
    });
  }

  if (isLoggedIn()) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminShell').classList.add('visible');
    initAdmin();
  }
});

function initAdmin() {
  // Sidebar nav links
  document.querySelectorAll('.sidebar-link[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Sidebar user info
  setupRoleUI();

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);

  // Modais — fechar ao clicar no overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Fechar com ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  });

  // Populate selects
  populateCampoSelects();
  populateDataSelects();

  // Header search
  document.getElementById('headerSearch')?.addEventListener('input', e => {
    if (APP.currentView === 'jogadores') renderJogadores(e.target.value);
  });

  // Jogadores search (inside page)
  document.getElementById('jogadoresSearch')?.addEventListener('input', e => renderJogadores(e.target.value));

  // Jogos filters
  document.getElementById('filtroDataJogos')?.addEventListener('change', e => {
    const d = e.target.value;
    const c = document.getElementById('filtroCampoJogos')?.value || 'todos';
    renderJogos(d, c);
  });
  document.getElementById('filtroCampoJogos')?.addEventListener('change', e => {
    const d = document.getElementById('filtroDataJogos')?.value || 'todos';
    renderJogos(d, e.target.value);
  });

  // Resultados filter
  document.getElementById('filtroDataRes')?.addEventListener('change', e => renderResultados(e.target.value));

  // Horário filters
  document.getElementById('horarioDataFilter')?.addEventListener('change', () => renderHorario());
  document.getElementById('horarioCampoFilter')?.addEventListener('change', () => renderHorario());

  // Session timeout watch
  Auth.startTimeoutWatch(
    (minsLeft) => {
      document.getElementById('timeoutCountdown').textContent = minsLeft + ' min';
      openModal('modalTimeout');
    },
    () => {
      closeModal('modalTimeout');
      doLogout();
    }
  );

  // Alert banner — show if > 20 pending results
  updateAlertBanner();

  // User role modal — show/hide categories on role change
  document.getElementById('userRole')?.addEventListener('change', updateUserCategoriesVisibility);

  // Ir para view inicial
  navigate('dashboard');
}

// ============================================
//  FASE FINAL — Bracket Logic
// ============================================

const FF_WILDCARD = ['M1', 'F1', 'M2', 'F2']; // 3 groups, needs 2 best 3rds
const FF_4G       = ['M3', 'M4'];               // 4 groups, top 2 each = 8
const FF_2G       = ['M5'];                     // 2 groups, top 2 each = 4 (no QF)

function ffLoad()       { return ppLoad('fasefinal') || {}; }
function ffSave(data)   { ppSave('fasefinal', data); }

function ffStandings(gJogos) {
  const pairs = new Set();
  gJogos.forEach(j => { pairs.add(j.eq1); pairs.add(j.eq2); });
  const st = {};
  pairs.forEach(p => { st[p] = { par: p, j: 0, v: 0, d: 0, sv: 0, sd: 0, gv: 0, gd: 0 }; });
  gJogos.forEach(j => {
    if (!j.resultado) return;
    const r = j.resultado;
    let s1 = 0, s2 = 0, gv1 = 0, gv2 = 0;
    [[r.s1eq1, r.s1eq2], [r.s2eq1, r.s2eq2], [r.s3eq1, r.s3eq2]].forEach(([a, b]) => {
      if (a == null || b == null) return;
      gv1 += a; gv2 += b;
      if (a > b) s1++; else s2++;
    });
    if (st[j.eq1]) { st[j.eq1].j++; st[j.eq1].sv += s1; st[j.eq1].sd += s2; st[j.eq1].gv += gv1; st[j.eq1].gd += gv2; if (s1 > s2) st[j.eq1].v++; else st[j.eq1].d++; }
    if (st[j.eq2]) { st[j.eq2].j++; st[j.eq2].sv += s2; st[j.eq2].sd += s1; st[j.eq2].gv += gv2; st[j.eq2].gd += gv1; if (s2 > s1) st[j.eq2].v++; else st[j.eq2].d++; }
  });
  return st;
}

function ffH2H(parA, parB, gJogos) {
  const m = gJogos.find(j => (j.eq1 === parA && j.eq2 === parB) || (j.eq1 === parB && j.eq2 === parA));
  if (!m || !m.resultado) return 0;
  const r = m.resultado; let s1 = 0, s2 = 0;
  [[r.s1eq1, r.s1eq2], [r.s2eq1, r.s2eq2], [r.s3eq1, r.s3eq2]].forEach(([a, b]) => { if (a != null && b != null) { if (a > b) s1++; else s2++; } });
  const aIsEq1 = m.eq1 === parA;
  return aIsEq1 ? (s1 > s2 ? -1 : s2 > s1 ? 1 : 0) : (s2 > s1 ? -1 : s1 > s2 ? 1 : 0);
}

function ffSortRows(rows, gJogos) {
  return [...rows].sort((a, b) => {
    if (b.v !== a.v) return b.v - a.v;
    const hh = ffH2H(a.par, b.par, gJogos); if (hh !== 0) return hh;
    const ds = (b.sv - b.sd) - (a.sv - a.sd); if (ds !== 0) return ds;
    const dg = (b.gv - b.gd) - (a.gv - a.gd); if (dg !== 0) return dg;
    return b.gv - a.gv;
  });
}

function ffSortByPerf(a, b) {
  if (b.v !== a.v) return b.v - a.v;
  const ds = (b.sv - b.sd) - (a.sv - a.sd); if (ds !== 0) return ds;
  return (b.gv - b.gd) - (a.gv - a.gd);
}

function ffGetQualified(catId) {
  const allJogos = getData('jogos');
  const grupos   = getData('grupos').filter(g => g.cat === catId);
  const firsts = [], seconds = [], thirds = [];
  grupos.forEach(g => {
    const gJogos = allJogos.filter(j => j.grupo === g.id);
    const sorted = ffSortRows(Object.values(ffStandings(gJogos)), gJogos);
    sorted.forEach((r, i) => {
      const e = { ...r, grupo: g.id, pos: i + 1 };
      if (i === 0) firsts.push(e);
      else if (i === 1) seconds.push(e);
      else if (i === 2) thirds.push(e);
    });
  });
  firsts.sort(ffSortByPerf); seconds.sort(ffSortByPerf); thirds.sort(ffSortByPerf);
  const q = [
    ...firsts.map((t, i)  => ({ ...t, tier: 1, seed: i + 1 })),
    ...seconds.map((t, i) => ({ ...t, tier: 2, seed: firsts.length + i + 1 })),
  ];
  if (FF_WILDCARD.includes(catId)) {
    thirds.slice(0, 2).forEach((t, i) => q.push({ ...t, tier: 3, seed: firsts.length + seconds.length + i + 1 }));
  }
  return q;
}

function ffMakeJogo(catId, fase, num, e1, e2, feedFrom = null) {
  return {
    id: `${catId}-${fase === 'F' ? 'F' : fase + num}`,
    fase, num, feedFrom,
    eq1: e1?.par ?? null, eq1grupo: e1?.grupo ?? null, eq1seed: e1?.seed ?? null,
    eq2: e2?.par ?? null, eq2grupo: e2?.grupo ?? null, eq2seed: e2?.seed ?? null,
    resultado: null,
  };
}

function ffGenerateBracket(catId) {
  const q = ffGetQualified(catId);
  const jogos = [];

  if (FF_2G.includes(catId)) {
    const bg = {};
    q.forEach(t => { (bg[t.grupo] = bg[t.grupo] || []).push(t); });
    const [gA, gB] = Object.keys(bg).sort();
    jogos.push(ffMakeJogo(catId, 'SF', 1, bg[gA][0], bg[gB][1]));
    jogos.push(ffMakeJogo(catId, 'SF', 2, bg[gB][0], bg[gA][1]));
    jogos.push(ffMakeJogo(catId, 'F',  1, null, null, [`${catId}-SF1`, `${catId}-SF2`]));

  } else if (FF_4G.includes(catId)) {
    const bg = {};
    q.forEach(t => { (bg[t.grupo] = bg[t.grupo] || []).push(t); });
    const gs = Object.keys(bg).sort().map(gId => ({ f: bg[gId][0], s: bg[gId][1] }));
    // QF1: 1A vs 2D, QF2: 1B vs 2C, QF3: 1C vs 2B, QF4: 1D vs 2A
    jogos.push(ffMakeJogo(catId, 'QF', 1, gs[0].f, gs[3].s));
    jogos.push(ffMakeJogo(catId, 'QF', 2, gs[1].f, gs[2].s));
    jogos.push(ffMakeJogo(catId, 'QF', 3, gs[2].f, gs[1].s));
    jogos.push(ffMakeJogo(catId, 'QF', 4, gs[3].f, gs[0].s));
    jogos.push(ffMakeJogo(catId, 'SF', 1, null, null, [`${catId}-QF1`, `${catId}-QF2`]));
    jogos.push(ffMakeJogo(catId, 'SF', 2, null, null, [`${catId}-QF3`, `${catId}-QF4`]));
    jogos.push(ffMakeJogo(catId, 'F',  1, null, null, [`${catId}-SF1`, `${catId}-SF2`]));

  } else {
    // 3 groups + 2 best 3rds = 8 → QF1=S1vS8, QF2=S4vS5, QF3=S3vS6, QF4=S2vS7
    const s = q; // already in seed order
    let pairs = [[s[0],s[7]], [s[3],s[4]], [s[2],s[5]], [s[1],s[6]]];
    // Fix same-group collisions: swap 3rds (S7/S8) if needed
    if (pairs[0][0]?.grupo === pairs[0][1]?.grupo || pairs[3][0]?.grupo === pairs[3][1]?.grupo)
      { [pairs[0][1], pairs[3][1]] = [pairs[3][1], pairs[0][1]]; }
    // Fix same-group collisions: swap 2nds (S5/S6) if needed
    if (pairs[2][0]?.grupo === pairs[2][1]?.grupo || pairs[1][0]?.grupo === pairs[1][1]?.grupo)
      { [pairs[1][1], pairs[2][1]] = [pairs[2][1], pairs[1][1]]; }
    pairs.forEach(([e1, e2], i) => jogos.push(ffMakeJogo(catId, 'QF', i + 1, e1, e2)));
    jogos.push(ffMakeJogo(catId, 'SF', 1, null, null, [`${catId}-QF1`, `${catId}-QF2`]));
    jogos.push(ffMakeJogo(catId, 'SF', 2, null, null, [`${catId}-QF3`, `${catId}-QF4`]));
    jogos.push(ffMakeJogo(catId, 'F',  1, null, null, [`${catId}-SF1`, `${catId}-SF2`]));
  }
  return { generated: true, jogos };
}

function ffGetWinner(r) {
  if (!r) return 0;
  let s1 = 0, s2 = 0;
  [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]].forEach(([a,b]) => { if (a!=null&&b!=null) { if(a>b) s1++; else s2++; } });
  return s1 > s2 ? 1 : s2 > s1 ? 2 : 0;
}

function ffPropagate(catId) {
  const ff = ffLoad();
  if (!ff[catId]) return;
  ff[catId].jogos.forEach(jogo => {
    if (!jogo.feedFrom || jogo.feedFrom.length < 2) return;
    const [j1, j2] = jogo.feedFrom.map(id => ff[catId].jogos.find(j => j.id === id));
    const w1 = ffGetWinner(j1?.resultado), w2 = ffGetWinner(j2?.resultado);
    jogo.eq1      = j1 ? (w1 === 1 ? j1.eq1 : w1 === 2 ? j1.eq2 : null) : null;
    jogo.eq1grupo = j1 ? (w1 === 1 ? j1.eq1grupo : w1 === 2 ? j1.eq2grupo : null) : null;
    jogo.eq2      = j2 ? (w2 === 1 ? j2.eq1 : w2 === 2 ? j2.eq2 : null) : null;
    jogo.eq2grupo = j2 ? (w2 === 1 ? j2.eq1grupo : w2 === 2 ? j2.eq2grupo : null) : null;
  });
  ffSave(ff);
}

function allGroupGamesDone(catId) {
  const jogos  = getData('jogos');
  const grupos = getData('grupos').filter(g => g.cat === catId);
  const catJogos = jogos.filter(j => grupos.some(g => g.id === j.grupo));
  return catJogos.length > 0 && catJogos.every(j => !!j.resultado);
}

// ---- Admin View ----
let ffCurrentCat = 'M1';

function renderFaseFinal() {
  const ff   = ffLoad();
  const cats = ['M1', 'M2', 'F1', 'F2', 'M3', 'M4', 'M5'];
  document.getElementById('ffCatTabs').innerHTML = cats.map(c =>
    `<button class="btn btn-sm ${c === ffCurrentCat ? 'btn-primary' : 'btn-ghost'}" onclick="ffSetCat('${c}')" style="min-width:3rem">${c}</button>`
  ).join('');

  const container = document.getElementById('ffBracket');
  const catData   = ff[ffCurrentCat];

  if (!catData?.generated) {
    const done = allGroupGamesDone(ffCurrentCat);
    container.innerHTML = `
      <div class="ff-empty">
        <i class="ph ph-trophy" style="font-size:3rem;color:var(--cinza-texto)"></i>
        <p style="color:var(--cinza-texto);margin:.5rem 0 1rem">
          Fase de grupos <strong>${done ? 'concluída' : 'ainda em curso'}</strong>
        </p>
        <button class="btn btn-primary" onclick="ffGenerate('${ffCurrentCat}')" ${!done ? 'disabled' : ''}>
          <i class="ph ph-magic-wand"></i>&nbsp; Gerar Bracket · ${ffCurrentCat}
        </button>
        ${!done ? `<p style="font-size:.72rem;color:var(--amarelo);margin-top:.6rem"><i class="ph ph-warning"></i> Aguarda conclusão de todos os jogos de grupo</p>` : ''}
      </div>`;
    return;
  }

  const { jogos } = catData;
  const allPhases = ['QF', 'SF', 'F'];
  const phases = allPhases.filter(p => jogos.some(j => j.fase === p));
  const phaseLabel = { QF: 'Quartos de Final', SF: 'Meias-Finais', F: 'Final' };

  const bracketCols = phases.map((fase, colIdx) => {
    const games = [...jogos.filter(j => j.fase === fase)].sort((a, b) => a.num - b.num);
    const isLast = colIdx === phases.length - 1;
    return games.map((g, i) => {
      const isTop = !isLast && i % 2 === 0;
      const isBot = !isLast && i % 2 === 1;
      const cls = ['bk-slot', isTop ? 'bk-slot-top' : isBot ? 'bk-slot-bot' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}">${ffCardHtml(g, ffCurrentCat)}</div>`;
    }).join('');
  });

  container.innerHTML = `
    <div class="bk-bracket">
      ${phases.map((fase, i) => `
        <div class="bk-round">
          <div class="bk-rhead">${phaseLabel[fase]}</div>
          ${bracketCols[i]}
        </div>`).join('')}
    </div>
    <div style="margin-top:1.25rem;display:flex;gap:.5rem;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" style="color:var(--amarelo);border-color:rgba(245,197,24,.3)" onclick="ffGerarAleatorios('${ffCurrentCat}')">
        <i class="ph ph-shuffle"></i> Resultados Aleatórios
      </button>
      <button class="btn btn-ghost btn-sm" style="color:var(--cinza-texto)" onclick="ffLimparResultados('${ffCurrentCat}')">
        <i class="ph ph-eraser"></i> Limpar Resultados
      </button>
      <button class="btn btn-ghost btn-sm" style="color:var(--vermelho);border-color:rgba(255,74,74,.3)" onclick="ffReset('${ffCurrentCat}')">
        <i class="ph ph-arrow-counter-clockwise"></i> Resetar Bracket
      </button>
    </div>`;
}

function ffCardHtml(j, catId) {
  const w    = ffGetWinner(j.resultado);
  const done = !!j.resultado;
  const fLabel = j.fase === 'F' ? 'Final' : j.fase === 'SF' ? `Meia-Final ${j.num}` : `QF ${j.num}`;

  const teamHtml = (name, grupo, seed, isWin) => {
    if (!name) return `<div class="bk-card-team tbd"><span class="bk-cname">A definir…</span></div>`;
    return `<div class="bk-card-team${isWin ? ' win' : ''}">
      ${seed ? `<span class="bk-cseed">${seed}</span>` : ''}
      <span class="bk-cname">${name}</span>
      ${grupo ? `<span class="bk-cgrp">${grupo}</span>` : ''}
    </div>`;
  };

  let scoreHtml = '';
  if (done) {
    const r = j.resultado;
    const sets = [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
      .filter(([a]) => a != null).map(([a,b]) => `${a}-${b}`).join(' / ');
    scoreHtml = `<div class="bk-card-score">${sets}</div>`;
  }

  const canEdit = !!(j.eq1 && j.eq2);
  return `
    <div class="bk-card${done ? ' done' : ''}${j.fase === 'F' ? ' is-final' : ''}">
      <div class="bk-card-lbl">${fLabel}</div>
      ${teamHtml(j.eq1, j.eq1grupo, j.eq1seed, done && w === 1)}
      <div class="bk-card-vs">VS</div>
      ${teamHtml(j.eq2, j.eq2grupo, j.eq2seed, done && w === 2)}
      ${scoreHtml}
      ${canEdit ? `<button class="btn btn-sm ${done ? 'btn-ghost' : 'btn-primary'}" style="width:100%;margin-top:.3rem;font-size:.72rem;padding:.28rem" onclick="ffAbrirResultado('${j.id}','${catId}')">
        <i class="ph ph-${done ? 'pencil-simple' : 'plus'}"></i> ${done ? 'Editar' : 'Lançar'}
      </button>` : ''}
    </div>`;
}

window.ffSetCat = function(cat) { ffCurrentCat = cat; renderFaseFinal(); };

window.ffGenerate = function(catId) {
  const ff = ffLoad();
  ff[catId] = ffGenerateBracket(catId);
  ffSave(ff);
  renderFaseFinal();
  Auth.log('GENERATE_BRACKET', 'fasefinal', `Bracket gerado: ${catId}`);
  toast(`Bracket gerado para ${catId}.`);
};

window.ffReset = function(catId) {
  if (!confirm(`Resetar o bracket de ${catId}? Todos os resultados desta fase serão apagados.`)) return;
  const ff = ffLoad(); delete ff[catId]; ffSave(ff);
  renderFaseFinal();
  Auth.log('RESET_BRACKET', 'fasefinal', `Bracket resetado: ${catId}`);
  toast(`Bracket de ${catId} removido.`);
};

window.ffGerarAleatorios = function(catId) {
  if (!confirm(`Preencher todos os jogos pendentes de ${catId} com resultados aleatórios?\n(Apenas para testes)`))
    return;
  const ff = ffLoad();
  if (!ff[catId]?.generated) return toast('Gera o bracket primeiro.', 'error');

  // Process phases in order so propagation fills next-round teams
  const phaseOrder = ['QF', 'SF', 'F'];
  let count = 0;
  phaseOrder.forEach(fase => {
    ff[catId].jogos.filter(j => j.fase === fase && !j.resultado && j.eq1 && j.eq2).forEach(j => {
      const s1 = randomSet(), s2 = randomSet();
      const w1 = s1.eq1 > s1.eq2 ? 1 : 2;
      const w2 = s2.eq1 > s2.eq2 ? 1 : 2;
      const r = {
        s1eq1: s1.eq1, s1eq2: s1.eq2, tb1eq1: s1.tbEq1, tb1eq2: s1.tbEq2,
        s2eq1: s2.eq1, s2eq2: s2.eq2, tb2eq1: s2.tbEq1, tb2eq2: s2.tbEq2,
        s3eq1: null,   s3eq2: null,   tb3eq1: null,      tb3eq2: null,
      };
      if (w1 !== w2) {
        const s3 = randomSet();
        r.s3eq1 = s3.eq1; r.s3eq2 = s3.eq2; r.tb3eq1 = s3.tbEq1; r.tb3eq2 = s3.tbEq2;
      }
      j.resultado = r;
      count++;
    });
    // Propagate winners before processing the next phase
    ffSave(ff);
    ffPropagate(catId);
    // Reload to get propagated team names
    const updated = ffLoad();
    ff[catId] = updated[catId];
  });

  renderFaseFinal();
  toast(`${count} resultado${count !== 1 ? 's' : ''} aleatório${count !== 1 ? 's' : ''} gerados para ${catId}.`);
};

window.ffLimparResultados = function(catId) {
  if (!confirm(`Limpar todos os resultados da Fase Final de ${catId}?`)) return;
  const ff = ffLoad();
  if (!ff[catId]?.generated) return;
  // Clear results and reset propagated teams on dependent games
  ff[catId].jogos.forEach(j => {
    j.resultado = null;
    if (j.feedFrom) { j.eq1 = null; j.eq1grupo = null; j.eq2 = null; j.eq2grupo = null; }
  });
  ffSave(ff);
  renderFaseFinal();
  toast(`Resultados de ${catId} removidos.`);
};

window.ffAbrirResultado = function(jogoId, catId) {
  const ff = ffLoad();
  const j  = ff[catId]?.jogos.find(j => j.id === jogoId);
  if (!j) return;
  APP.ffEditing = { catId, jogoId };
  APP.editingId = null;
  const fLabel = j.fase === 'F' ? 'Final' : j.fase === 'SF' ? `Meia-Final ${j.num}` : `Quarto de Final ${j.num}`;
  document.getElementById('resMatchInfo').textContent = `${catId} · ${fLabel}`;
  document.getElementById('resTeam1').textContent = j.eq1;
  document.getElementById('resTeam2').textContent = j.eq2;
  [1, 2, 3].forEach(n => clearSetInputs(n));
  [2, 3].forEach(n => { document.getElementById(`setBlock${n}`).style.display = 'none'; });
  document.getElementById('matchResultBar').style.display = 'none';
  const r = j.resultado;
  if (r) {
    const loadSet = (n, e1, e2, tb1, tb2) => {
      const isTb = (e1 === 7 && e2 === 6) || (e1 === 6 && e2 === 7);
      document.getElementById(`resS${n}E1`).value = isTb ? 6 : e1;
      document.getElementById(`resS${n}E2`).value = isTb ? 6 : e2;
      if (isTb && tb1 != null) { document.getElementById(`resTB${n}E1`).value = tb1; document.getElementById(`resTB${n}E2`).value = tb2; }
    };
    loadSet(1, r.s1eq1, r.s1eq2, r.tb1eq1, r.tb1eq2);
    if (r.s2eq1 !== null) loadSet(2, r.s2eq1, r.s2eq2, r.tb2eq1, r.tb2eq2);
    if (r.s3eq1 !== null) loadSet(3, r.s3eq1, r.s3eq2, r.tb3eq1, r.tb3eq2);
  }
  onSetInput(1);
  if (r?.s2eq1 !== null) onSetInput(2);
  if (r?.s3eq1 !== null) onSetInput(3);
  openModal('modalResultado');
};


// ============================================
//  ROLE UI SETUP
// ============================================
function setupRoleUI() {
  const me = Auth.me();
  if (!me) return;

  // Update sidebar footer
  document.getElementById('sidebarAvatar').textContent = me.name.charAt(0).toUpperCase();
  document.getElementById('sidebarName').textContent   = me.name;
  document.getElementById('sidebarRole').textContent   = me.role === 'admin' ? 'Administrador � Play Padel' : 'Operador � Play Padel';

  // Show/hide SISTEMA group (admin only)
  const sistemaGroup = document.getElementById('sidebarSistema');
  if (sistemaGroup) sistemaGroup.style.display = me.role === 'admin' ? '' : 'none';
}

// ============================================
//  UTILIZADORES VIEW
// ============================================
function renderUtilizadores() {
  if (!Auth.isAdmin()) { navigate('dashboard'); return; }
  const users = Auth.getUsers();
  const me    = Auth.me();

  document.getElementById('tblUtilizadores').innerHTML = `
    <div class="card" style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--preto-borda);text-align:left">
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Utilizador</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Nome</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Role</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Estado</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Criado em</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Ac��es</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr style="border-bottom:1px solid var(--preto-borda)">
              <td style="padding:.65rem .8rem;font-weight:700;color:var(--branco)">${u.username}</td>
              <td style="padding:.65rem .8rem">${u.name}</td>
              <td style="padding:.65rem .8rem">
                <span style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.2rem .55rem;border-radius:4px;background:${u.role === 'admin' ? 'rgba(245,197,24,.15)' : 'rgba(0,195,123,.12)'};color:${u.role === 'admin' ? 'var(--amarelo)' : 'var(--verde)'}">
                  ${u.role === 'admin' ? 'Admin' : 'Operador'}
                </span>
              </td>
              <td style="padding:.65rem .8rem">
                <span style="font-size:.65rem;font-weight:700;text-transform:uppercase;padding:.2rem .55rem;border-radius:4px;background:${u.active ? 'rgba(0,195,123,.12)' : 'rgba(255,74,74,.12)'};color:${u.active ? 'var(--verde)' : 'var(--vermelho)'}">
                  ${u.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td style="padding:.65rem .8rem;font-size:.72rem;color:var(--cinza-texto)">${new Date(u.createdAt).toLocaleDateString('pt-PT')}</td>
              <td style="padding:.65rem .8rem">
                <div style="display:flex;gap:.35rem;align-items:center">
                  <button class="btn btn-ghost btn-sm" onclick="uiEditUser('${u.id}')" title="Editar"><i class="ph ph-pencil"></i></button>
                  ${u.username !== 'admin' ? `
                    <button class="btn btn-ghost btn-sm" onclick="uiToggleUser('${u.id}')" title="${u.active ? 'Desactivar' : 'Activar'}">
                      <i class="ph ph-${u.active ? 'pause-circle' : 'play-circle'}"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--vermelho)" onclick="uiDeleteUser('${u.id}','${escHtml(u.username)}')" title="Eliminar">
                      <i class="ph ph-trash"></i>
                    </button>
                  ` : `<span style="font-size:.65rem;color:var(--cinza-texto)">protegido</span>`}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// User modal helpers
let _editUserId = null;

function uiNewUser() {
  _editUserId = null;
  document.getElementById('modalUserTitle').textContent = 'Novo Utilizador';
  document.getElementById('userUsername').value  = '';
  document.getElementById('userUsername').disabled = false;
  document.getElementById('userName').value      = '';
  document.getElementById('userRole').value      = 'operator';
  document.getElementById('userPass').value      = '';
  document.getElementById('userPass2').value     = '';
  document.getElementById('userPassLabel').textContent  = 'Palavra-passe *';
  document.getElementById('userPass2Label').textContent = 'Confirmar palavra-passe *';
  document.getElementById('userPass').required   = true;
  document.getElementById('userPass2').required  = true;
  _buildCategoryCheckboxes([]);
  updateUserCategoriesVisibility();
  _hideUserError();
  openModal('modalUser');
}

function uiEditUser(id) {
  const u = Auth.getUsers().find(x => x.id === id);
  if (!u) return;
  _editUserId = id;
  document.getElementById('modalUserTitle').textContent = 'Editar Utilizador';
  document.getElementById('userUsername').value    = u.username;
  document.getElementById('userUsername').disabled = u.username === 'admin';
  document.getElementById('userName').value        = u.name;
  document.getElementById('userRole').value        = u.role;
  document.getElementById('userPass').value        = '';
  document.getElementById('userPass2').value       = '';
  document.getElementById('userPassLabel').textContent  = 'Nova palavra-passe (deixar em branco para manter)';
  document.getElementById('userPass2Label').textContent = 'Confirmar nova palavra-passe';
  document.getElementById('userPass').required   = false;
  document.getElementById('userPass2').required  = false;
  _buildCategoryCheckboxes(u.categories || []);
  updateUserCategoriesVisibility();
  _hideUserError();
  openModal('modalUser');
}

function uiSaveUser() {
  const username = document.getElementById('userUsername').value.trim();
  const name     = document.getElementById('userName').value.trim();
  const role     = document.getElementById('userRole').value;
  const pass     = document.getElementById('userPass').value;
  const pass2    = document.getElementById('userPass2').value;

  if (!username || !name) return _showUserError('Username e nome s�o obrigat�rios.');
  if (_editUserId === null && !pass) return _showUserError('Palavra-passe obrigat�ria para novo utilizador.');
  if (pass && pass.length < 6) return _showUserError('Palavra-passe deve ter pelo menos 6 caracteres.');
  if (pass && pass !== pass2)  return _showUserError('As palavras-passe n�o coincidem.');

  let result;
  if (_editUserId === null) {
    const categories = role === 'operator'
      ? [...document.querySelectorAll('#userCategoriesGrid input[type=checkbox]:checked')].map(c => c.value)
      : [];
    result = Auth.createUser(username, name, role, pass, categories);
  } else {
    const categories = role === 'operator'
      ? [...document.querySelectorAll('#userCategoriesGrid input[type=checkbox]:checked')].map(c => c.value)
      : [];
    const changes = { username, name, role, categories };
    if (pass) changes.password = pass;
    result = Auth.updateUser(_editUserId, changes);
  }

  if (!result.ok) return _showUserError(result.error);

  closeModal('modalUser');
  toast(_editUserId === null ? `Utilizador "${username}" criado.` : `Utilizador "${username}" actualizado.`);
  renderUtilizadores();
}

function uiToggleUser(id) {
  const result = Auth.toggleUser(id);
  if (!result.ok) return toast(result.error, 'error');
  toast(result.active ? 'Utilizador activado.' : 'Utilizador desactivado.');
  renderUtilizadores();
}

function uiDeleteUser(id, username) {
  if (!confirm(`Eliminar o utilizador "${username}"? Esta ac��o n�o pode ser desfeita.`)) return;
  const result = Auth.deleteUser(id);
  if (!result.ok) return toast(result.error, 'error');
  toast(`Utilizador "${username}" eliminado.`);
  renderUtilizadores();
}

function _showUserError(msg) {
  const el = document.getElementById('userModalError');
  document.getElementById('userModalErrorMsg').textContent = msg;
  el.style.display = 'flex';
}
function _hideUserError() {
  document.getElementById('userModalError').style.display = 'none';
}

// ============================================
//  LOGS VIEW
// ============================================
function renderLogs() {
  if (!Auth.isAdmin()) { navigate('dashboard'); return; }
  const logs = Auth.getLogs().slice(0, 300);

  const actionStyle = {
    LOGIN:            'color:var(--verde)',
    LOGOUT:           'color:var(--cinza-texto)',
    CREATE_USER:      'color:var(--amarelo)',
    UPDATE_USER:      'color:var(--amarelo)',
    DELETE_USER:      'color:var(--vermelho)',
    ENABLE_USER:      'color:var(--verde)',
    DISABLE_USER:     'color:var(--vermelho)',
    FORCE_LOGOUT:     'color:var(--vermelho)',
    SAVE_RESULT:      'color:var(--verde)',
    SAVE_RESULT_FF:   'color:var(--verde)',
    CLEAR_RESULT:     'color:var(--cinza-texto)',
    GENERATE_BRACKET: 'color:var(--amarelo)',
    RESET_BRACKET:    'color:var(--vermelho)',
    RENAME_JOGADOR:   'color:var(--amarelo)',
    CREATE_CAMPO:     'color:var(--verde)',
    UPDATE_CAMPO:     'color:var(--amarelo)',
    DELETE_CAMPO:     'color:var(--vermelho)',
  };

  document.getElementById('tblLogs').innerHTML = logs.length === 0
    ? `<div style="text-align:center;padding:3rem;color:var(--cinza-texto)"><i class="ph ph-clipboard-text" style="font-size:2.5rem;display:block;margin-bottom:.6rem"></i>Sem registos de auditoria.</div>`
    : `<div class="card" style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--preto-borda);text-align:left">
              <th style="padding:.55rem .7rem;color:var(--cinza-texto);font-size:.7rem;font-weight:600;text-transform:uppercase;white-space:nowrap">Data/Hora</th>
              <th style="padding:.55rem .7rem;color:var(--cinza-texto);font-size:.7rem;font-weight:600;text-transform:uppercase">Utilizador</th>
              <th style="padding:.55rem .7rem;color:var(--cinza-texto);font-size:.7rem;font-weight:600;text-transform:uppercase">Role</th>
              <th style="padding:.55rem .7rem;color:var(--cinza-texto);font-size:.7rem;font-weight:600;text-transform:uppercase">Ac��o</th>
              <th style="padding:.55rem .7rem;color:var(--cinza-texto);font-size:.7rem;font-weight:600;text-transform:uppercase">Alvo</th>
              <th style="padding:.55rem .7rem;color:var(--cinza-texto);font-size:.7rem;font-weight:600;text-transform:uppercase">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => `
              <tr style="border-bottom:1px solid var(--preto-borda)">
                <td style="padding:.55rem .7rem;font-size:.7rem;color:var(--cinza-texto);white-space:nowrap">${new Date(l.ts).toLocaleString('pt-PT')}</td>
                <td style="padding:.55rem .7rem;font-weight:600;font-size:.82rem">${escHtml(l.username)}</td>
                <td style="padding:.55rem .7rem">
                  <span style="font-size:.62rem;font-weight:700;text-transform:uppercase;padding:.15rem .45rem;border-radius:3px;background:${l.role === 'admin' ? 'rgba(245,197,24,.15)' : 'rgba(0,195,123,.12)'};color:${l.role === 'admin' ? 'var(--amarelo)' : 'var(--verde)'}">
                    ${l.role === 'admin' ? 'Admin' : l.role === 'operator' ? 'Oper.' : l.role}
                  </span>
                </td>
                <td style="padding:.55rem .7rem">
                  <span style="font-size:.68rem;font-weight:700;${actionStyle[l.action] || 'color:var(--branco)'}">${l.action}</span>
                </td>
                <td style="padding:.55rem .7rem;font-size:.75rem;color:var(--cinza-texto)">${escHtml(l.target)}</td>
                <td style="padding:.55rem .7rem;font-size:.75rem;color:var(--cinza-texto)">${escHtml(l.detail)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
}

// ============================================
//  SESS�ES VIEW
// ============================================
function renderSessoes() {
  if (!Auth.isAdmin()) { navigate('dashboard'); return; }
  const sessions = Auth.getSessions();
  const me       = Auth.me();

  const container = document.getElementById('listSessoes');
  if (sessions.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--cinza-texto)"><i class="ph ph-monitor" style="font-size:2.5rem;display:block;margin-bottom:.6rem"></i>Nenhuma sess�o activa.</div>`;
    return;
  }

  container.innerHTML = sessions.map(s => `
    <div class="card" style="display:flex;align-items:center;gap:1rem;padding:.9rem 1.2rem;margin-bottom:.6rem">
      <div style="background:var(--cinza-escuro);width:2.4rem;height:2.4rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--branco);flex-shrink:0;font-size:1rem">
        ${escHtml(s.name.charAt(0).toUpperCase())}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:var(--branco);font-size:.92rem">${escHtml(s.name)} <span style="font-size:.72rem;color:var(--cinza-texto);font-weight:400">(${escHtml(s.username)})</span></div>
        <div style="font-size:.7rem;color:var(--cinza-texto);margin-top:.15rem">
          Login: ${new Date(s.loginAt).toLocaleString('pt-PT')} &nbsp;�&nbsp; �ltima actividade: ${new Date(s.lastActivity).toLocaleString('pt-PT')}
        </div>
      </div>
      <span style="font-size:.65rem;font-weight:700;text-transform:uppercase;padding:.2rem .55rem;border-radius:4px;flex-shrink:0;background:${s.role === 'admin' ? 'rgba(245,197,24,.15)' : 'rgba(0,195,123,.12)'};color:${s.role === 'admin' ? 'var(--amarelo)' : 'var(--verde)'}">
        ${s.role === 'admin' ? 'Admin' : 'Operador'}
      </span>
      ${s.sessionId === me?.sessionId
        ? `<span style="font-size:.68rem;color:var(--verde);font-weight:700;flex-shrink:0">? Esta sess�o</span>`
        : `<button class="btn btn-ghost btn-sm" style="color:var(--vermelho);flex-shrink:0" onclick="uiForceLogout('${escHtml(s.sessionId)}','${escHtml(s.username)}')">
             <i class="ph ph-sign-out"></i> Encerrar
           </button>`}
    </div>
  `).join('');
}

function uiForceLogout(sessionId, username) {
  if (!confirm(`Encerrar a sess�o de "${username}"?`)) return;
  Auth.forceLogout(sessionId);
  toast(`Sess�o de "${username}" encerrada.`);
  renderSessoes();
}

// ============================================
//  HELPER: category checkboxes in user modal
// ============================================
const _ALL_CATS = ['M1','M2','M3','M4','M5','F1','F2'];

function _buildCategoryCheckboxes(selectedCats) {
  const grid = document.getElementById('userCategoriesGrid');
  if (!grid) return;
  grid.innerHTML = _ALL_CATS.map(cat => `
    <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.82rem">
      <input type="checkbox" value="${cat}" ${selectedCats.includes(cat) ? 'checked' : ''}
        style="accent-color:var(--verde);width:15px;height:15px">
      <span>${cat}</span>
    </label>`).join('');
}

function updateUserCategoriesVisibility() {
  const role = document.getElementById('userRole')?.value;
  const wrap = document.getElementById('userCategoriesWrap');
  if (wrap) wrap.style.display = role === 'operator' ? 'block' : 'none';
}

// ============================================
//  ADMIN STANDINGS (Classifica��es view)
// ============================================
function renderAdminClassificacoes() {
  const cats = getData('categorias').map(c => c.id);
  const grupos = getData('grupos');
  const jogos  = getData('jogos');

  const tabsEl    = document.getElementById('adminClassTabs');
  const contentEl = document.getElementById('adminClassContent');
  if (!tabsEl || !contentEl) return;

  tabsEl.innerHTML = cats.map((c, i) => `
    <button class="tab-btn${i===0?' active':''}" onclick="_adminClassTab('${c}',this)">${c}</button>
  `).join('');

  _renderAdminClassCat(cats[0], grupos, jogos, contentEl);
}

function _adminClassTab(catId, btn) {
  document.querySelectorAll('#adminClassTabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const grupos = getData('grupos');
  const jogos  = getData('jogos');
  _renderAdminClassCat(catId, grupos, jogos, document.getElementById('adminClassContent'));
}

function _adminClassCatGroups(catId, grupos) {
  return grupos.filter(g => g.categoria === catId);
}

function _adminClassStandings(grupo, jogos) {
  const gJogos = jogos.filter(j => j.grupo === grupo.id);
  const pairs = {};
  grupo.pares.forEach(p => { pairs[p] = { par: p, pj:0, v:0, d:0, pts:0, sw:0, sl:0, gw:0, gl:0 }; });
  gJogos.forEach(j => {
    if (!j.resultado) return;
    const [s1,s2] = j.resultado.split(' ').map(s => s.split('-').map(Number));
    let vEq1=0, vEq2=0;
    const sets = [s1, ...( s2 ? [s2] : [] )];
    // parse all sets
    const allSets = j.resultado.trim().split(' ').map(s => { const [a,b] = s.split('-').map(Number); return [a,b]; });
    allSets.forEach(([a,b]) => {
      if (a > b) vEq1++; else vEq2++;
      if (pairs[j.eq1]) { pairs[j.eq1].sw += a; pairs[j.eq1].sl += b; }
      if (pairs[j.eq2]) { pairs[j.eq2].sw += b; pairs[j.eq2].sl += a; }
    });
    const eq1win = vEq1 > vEq2;
    if (pairs[j.eq1]) { pairs[j.eq1].pj++; if (eq1win) { pairs[j.eq1].v++; pairs[j.eq1].pts+=3; } else pairs[j.eq1].d++; }
    if (pairs[j.eq2]) { pairs[j.eq2].pj++; if (!eq1win){ pairs[j.eq2].v++; pairs[j.eq2].pts+=3; } else pairs[j.eq2].d++; }
  });
  return Object.values(pairs).sort((a,b) => b.pts - a.pts || (b.sw-b.sl)-(a.sw-a.sl) || b.sw - a.sw);
}

function _renderAdminClassCat(catId, grupos, jogos, el) {
  const catGroups = _adminClassCatGroups(catId, grupos);
  if (!catGroups.length) { el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem grupos para esta categoria.</p>`; return; }
  el.innerHTML = `<div class="admin-standings-grid">
    ${catGroups.map(g => {
      const rows = _adminClassStandings(g, jogos);
      const gJogos = jogos.filter(j => j.grupo === g.id);
      const done = gJogos.filter(j => j.resultado).length;
      return `<div class="admin-group-card">
        <div class="admin-group-card-header">
          <span style="font-weight:700;color:var(--branco)">${g.id}</span>
          <span style="font-size:.68rem;color:var(--cinza-texto)">${done}/${gJogos.length} jogos</span>
        </div>
        <table class="std-table">
          <thead><tr><th>#</th><th>Par</th><th>PJ</th><th>V</th><th>D</th><th>S</th><th>Pts</th></tr></thead>
          <tbody>${rows.map((r, i) => `
            <tr class="${i===0?'std-q1':i===1?'std-q2':''}">
              <td>${i+1}</td>
              <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(r.par)}">${escHtml(r.par)}</td>
              <td>${r.pj}</td><td style="color:var(--verde)">${r.v}</td><td style="color:var(--vermelho)">${r.d}</td>
              <td>${r.sw}-${r.sl}</td><td style="font-weight:700;color:var(--branco)">${r.pts}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }).join('')}
  </div>`;
}

// ============================================
//  ESTAT�STICAS (player leaderboard)
// ============================================
function renderEstatisticas() {
  const el = document.getElementById('statsContent');
  if (!el) return;
  const jogos = getData('jogos').filter(j => j.resultado);

  // Aggregate per pair
  const stats = {};
  function addPair(par, wins, losses, sw, sl) {
    if (!par) return;
    if (!stats[par]) stats[par] = { par, pj:0, v:0, d:0, sw:0, sl:0 };
    stats[par].pj += wins + losses;
    stats[par].v  += wins;
    stats[par].d  += losses;
    stats[par].sw += sw;
    stats[par].sl += sl;
  }

  jogos.forEach(j => {
    const allSets = j.resultado.trim().split(' ').map(s => { const [a,b] = s.split('-').map(Number); return [a,b]; });
    let vEq1=0, vEq2=0, sw1=0, sl1=0, sw2=0, sl2=0;
    allSets.forEach(([a,b]) => {
      if (a>b) vEq1++; else vEq2++;
      sw1+=a; sl1+=b; sw2+=b; sl2+=a;
    });
    const eq1win = vEq1 > vEq2;
    addPair(j.eq1, eq1win?1:0, eq1win?0:1, sw1, sl1);
    addPair(j.eq2, eq1win?0:1, eq1win?1:0, sw2, sl2);
  });

  const sorted = Object.values(stats)
    .filter(s => s.pj > 0)
    .sort((a,b) => (b.v/b.pj||0)-(a.v/a.pj||0) || b.v-a.v)
    .slice(0, 30);

  if (!sorted.length) { el.innerHTML = `<p style="color:var(--cinza-texto);padding:1.5rem">Nenhum jogo com resultado ainda.</p>`; return; }

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>#</th><th>Par</th><th>PJ</th><th>V</th><th>D</th><th>Taxa V%</th><th>Sets</th></tr></thead>
        <tbody>${sorted.map((s, i) => {
          const pct = s.pj ? Math.round(s.v/s.pj*100) : 0;
          const bar = `<div style="display:inline-block;width:${pct}%;max-width:80px;height:5px;background:var(--verde);border-radius:3px;vertical-align:middle;margin-left:.4rem"></div>`;
          return `<tr>
            <td>${i+1}</td>
            <td style="font-weight:600;color:var(--branco);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(s.par)}</td>
            <td>${s.pj}</td>
            <td style="color:var(--verde);font-weight:700">${s.v}</td>
            <td style="color:var(--vermelho)">${s.d}</td>
            <td>${pct}%${bar}</td>
            <td>${s.sw}-${s.sl}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ============================================
//  IMPORTAR (bulk CSV result import)
// ============================================
function renderImportar() {
  const el = document.getElementById('importContent');
  if (!el) return;
  el.innerHTML = `
    <div class="section-card" style="max-width:800px">
      <h3 style="margin-bottom:.25rem">Importa��o em Lote</h3>
      <p style="color:var(--cinza-texto);font-size:.82rem;margin-bottom:1rem">
        Cole resultados no formato CSV: <code style="background:var(--cinza-escuro);padding:.1rem .4rem;border-radius:4px;font-size:.78rem">jogoId,set1eq1-set1eq2,set2eq1-set2eq2[,set3eq1-set3eq2]</code>
      </p>
      <div class="import-area">
        <textarea id="importCSV" placeholder="Exemplo:&#10;1,6-4,6-3&#10;2,3-6,4-6&#10;5,6-2,6-1&#10;12,7-5,4-6,6-4"></textarea>
      </div>
      <div style="display:flex;gap:.75rem;margin-bottom:1rem">
        <button class="btn btn-primary btn-sm" onclick="_importPreview()"><i class="ph ph-eye"></i> Pr�-visualizar</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('importCSV').value=''">Limpar</button>
      </div>
      <div id="importPreviewWrap"></div>
    </div>`;
}

function _importPreview() {
  const raw = document.getElementById('importCSV')?.value.trim();
  if (!raw) return;
  const jogos = getData('jogos');
  const lines = raw.split('\n').filter(l => l.trim());
  const rows = lines.map(line => {
    const parts = line.trim().split(',');
    const id = parseInt(parts[0]);
    const sets = parts.slice(1).join(' ').trim();
    const jogo = jogos.find(j => j.id === id);
    const ok = !!jogo && sets.match(/^\d+-\d+( \d+-\d+)*$/);
    return { id, sets, jogo, ok, dup: jogo?.resultado };
  });

  const wrap = document.getElementById('importPreviewWrap');
  wrap.innerHTML = `
    <div class="import-preview" style="margin-bottom:1rem">
      <table class="data-table" style="font-size:.78rem">
        <thead><tr><th>ID</th><th>Par 1</th><th>Par 2</th><th>Resultado</th><th>Estado</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td>${r.id}</td>
          <td>${r.jogo ? escHtml(r.jogo.eq1) : '�'}</td>
          <td>${r.jogo ? escHtml(r.jogo.eq2) : '�'}</td>
          <td><code>${escHtml(r.sets)}</code></td>
          <td>${!r.jogo ? '<span class="badge badge-vermelho">N�o encontrado</span>' :
               !r.ok    ? '<span class="badge badge-vermelho">Formato inv�lido</span>' :
               r.dup    ? '<span class="badge badge-amarelo">Substituir</span>' :
                          '<span class="badge badge-verde">OK</span>'}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:flex;gap:.75rem;align-items:center">
      <button class="btn btn-primary btn-sm" onclick="_importConfirm()">
        <i class="ph ph-check"></i> Confirmar Importa��o (${rows.filter(r=>r.ok).length} v�lidos)
      </button>
      <span style="font-size:.78rem;color:var(--cinza-texto)">${rows.filter(r=>!r.ok).length} inv�lidos ser�o ignorados</span>
    </div>`;

  // Store parsed for confirm
  wrap._parsed = rows;
}

function _importConfirm() {
  const wrap = document.getElementById('importPreviewWrap');
  if (!wrap._parsed) return;
  const jogos = getData('jogos');
  let count = 0;
  wrap._parsed.filter(r => r.ok).forEach(r => {
    const idx = jogos.findIndex(j => j.id === r.id);
    if (idx < 0) return;
    jogos[idx].resultado = r.sets;
    count++;
  });
  setData('jogos', jogos);
  Auth.log('IMPORT_BULK', `${count} resultados importados em lote`);
  toast(`${count} resultados importados com sucesso.`);
  renderImportar();
}

// ============================================
//  HOR�RIO BUILDER
// ============================================
function renderHorario() {
  const el = document.getElementById('horarioContent');
  if (!el) return;

  const jogos  = getData('jogos');
  const campos = getData('campos').map(c => c.nome);

  // Populate filters if empty
  const dataFilter  = document.getElementById('horarioDataFilter');
  const campoFilter = document.getElementById('horarioCampoFilter');
  if (dataFilter && !dataFilter.options.length) {
    const dates = [...new Set(jogos.map(j => j.data))].sort();
    dates.forEach(d => { const o = new Option(formatDate(d), d); dataFilter.appendChild(o); });
  }
  if (campoFilter && !campoFilter.options.length) {
    campos.forEach(c => { const o = new Option(c, c); campoFilter.appendChild(o); });
  }

  const selDate  = dataFilter?.value;
  const selCampo = campoFilter?.value;
  if (!selDate) return el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Seleccione uma data para ver o hor�rio.</p>`;

  const dayJogos = jogos.filter(j => j.data === selDate && (!selCampo || j.campo === selCampo));
  if (!dayJogos.length) return el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem jogos para os filtros seleccionados.</p>`;

  const times  = [...new Set(dayJogos.map(j => j.hora))].sort();
  const activeCampos = selCampo ? [selCampo] : [...new Set(dayJogos.map(j => j.campo))].sort();

  // Build player ? slots map to detect conflicts
  const playerSlots = {};
  dayJogos.forEach(j => {
    [j.eq1, j.eq2].forEach(pair => {
      if (!pair) return;
      pair.split(' / ').forEach(player => {
        const key = player.trim().toLowerCase();
        if (!playerSlots[key]) playerSlots[key] = [];
        playerSlots[key].push(j.hora);
      });
    });
  });
  const conflictPlayers = new Set(Object.entries(playerSlots)
    .filter(([,slots]) => slots.length !== [...new Set(slots)].length)
    .map(([k]) => k));

  function hasConflict(j) {
    return [j.eq1, j.eq2].some(pair => pair?.split(' / ').some(p => conflictPlayers.has(p.trim().toLowerCase())));
  }

  el.innerHTML = `
    <div class="schedule-grid" style="grid-template-columns:80px ${activeCampos.map(()=>'1fr').join(' ')}">
      <div class="schedule-grid-header">Hora</div>
      ${activeCampos.map(c => `<div class="schedule-grid-header">${c}</div>`).join('')}
      ${times.map(t => `
        <div class="schedule-time" style="display:flex;align-items:center;padding:.4rem .6rem;font-weight:700;color:var(--cinza-texto)">${t}</div>
        ${activeCampos.map(campo => {
          const j = dayJogos.find(x => x.hora === t && x.campo === campo);
          if (!j) return `<div class="schedule-slot"></div>`;
          const conflict = hasConflict(j);
          return `<div class="schedule-slot has-game${conflict?' has-conflict':''}">
            ${conflict ? '<span class="conflict-badge">CONFLITO</span>' : ''}
            <div style="font-size:.7rem;color:var(--cinza-texto);margin-bottom:.2rem">${j.grupo}</div>
            <div style="font-size:.75rem;font-weight:600;color:var(--branco);line-height:1.3">
              <span title="${escHtml(j.eq1)}">${escHtml(j.eq1.split('/')[0] || j.eq1)}</span>
              <span style="color:var(--cinza-texto);margin:0 .2rem">vs</span>
              <span title="${escHtml(j.eq2)}">${escHtml(j.eq2.split('/')[0] || j.eq2)}</span>
            </div>
            ${j.resultado ? `<div style="font-size:.68rem;color:var(--verde);margin-top:.2rem">${j.resultado}</div>` : ''}
          </div>`;
        }).join('')}
      `).join('')}
    </div>`;
}

// ============================================
//  GITHUB SYNC — UI
// ============================================

/** Open GitHub config modal, pre-filling saved values */
function ghShowConfig() {
  const c = GHSync.getCfg();
  document.getElementById('ghOwner').value  = c.owner  || '';
  document.getElementById('ghRepo').value   = c.repo   || '';
  document.getElementById('ghBranch').value = c.branch || 'main';
  document.getElementById('ghToken').value  = c.token  ? '••••••••' : '';
  openModal('modalGHSync');
}

/** Save config and run a test push */
async function ghSaveConfig() {
  const owner  = document.getElementById('ghOwner').value.trim();
  const repo   = document.getElementById('ghRepo').value.trim();
  const branch = document.getElementById('ghBranch').value.trim() || 'main';
  const rawToken = document.getElementById('ghToken').value.trim();
  if (!owner || !repo || !rawToken) { toast('Preencha todos os campos obrigatórios.', 'error'); return; }
  // Keep existing token if user left the masked placeholder
  const existing = GHSync.getCfg().token || '';
  const token = (rawToken === '••••••••') ? existing : rawToken;
  GHSync.setCfg({ owner, repo, branch, token });
  closeModal('modalGHSync');
  await ghSyncAll();
}

/** Push all data to GitHub and update button state */
async function ghSyncAll() {
  if (!GHSync.isConfigured()) { ghShowConfig(); return; }
  const btn   = document.getElementById('ghSyncBtn');
  const icon  = document.getElementById('ghSyncIcon');
  const label = document.getElementById('ghSyncLabel');
  const dot   = document.getElementById('ghDirtyDot');
  if (!btn) return;

  btn.disabled = true;
  icon.className  = 'ph ph-circle-notch gh-spin';
  label.textContent = 'A sincronizar…';
  dot.style.display = 'none';

  try {
    await GHSync.push(GHSync.getAllData());
    icon.className  = 'ph ph-check-circle';
    label.textContent = 'Sincronizado';
    btn.disabled = false;
    toast('Dados sincronizados! O site público actualiza em ~30 segundos.', 'success');
    setTimeout(() => {
      icon.className  = 'ph ph-cloud-arrow-up';
      label.textContent = 'Sync';
    }, 4000);
  } catch(err) {
    icon.className  = 'ph ph-warning-circle';
    label.textContent = 'Erro';
    btn.disabled = false;
    dot.style.display = 'block';
    toast('Erro ao sincronizar: ' + err.message, 'error');
    setTimeout(() => {
      icon.className  = 'ph ph-cloud-arrow-up';
      label.textContent = 'Sync';
    }, 4000);
  }
}

/** Wire dirty indicator to ghsync events */
document.addEventListener('ghsync:dirty', () => {
  const dot = document.getElementById('ghDirtyDot');
  if (dot) dot.style.display = 'block';
});
document.addEventListener('ghsync:clean', () => {
  const dot = document.getElementById('ghDirtyDot');
  if (dot) dot.style.display = 'none';
});
