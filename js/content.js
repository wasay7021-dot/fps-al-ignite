/* =====================================================================
   FPS IGNITE XIII - everything you can edit on the HOME and COUNCIL pages
   ---------------------------------------------------------------------
   Change the words between the quote marks ' ' (or " ").
   Do NOT delete the commas, brackets [ ] or braces { } around them.
   After editing, upload the site again (see EDITING.md).
   ===================================================================== */
window.SITE_CONTENT = {

  /* ---------------- top of the page ---------------- */
  HERO: {
    presents: 'Foundation Public School presents',
    tagline: 'FIRE UP. PITCH UP. LEVEL UP.',
    sub: 'The next generation of entrepreneurs'
  },

  /* ---------------- What is IGNITE? ---------------- */
  ABOUT: {
    title: 'What is IGNITE?',
    paragraphs: [
      'An entrepreneurial arena for O-Level students at Foundation Public School and Headstart School System.',
      'FPS IGNITE brings together creativity, strategy and teamwork — giving your delegation the opportunity to build a business from the ground up.'
    ],
    /* picture shown next to the text: put the file in images/ (any size) */
    photo: 'images/about.jpg',
    photoNote: 'Add images/about.jpg',
    perspectivesTitle: 'One team. Four perspectives.',
    perspectivesText: 'Each delegation includes a Content Writer, Videographer, Techno-wiz and Spokesperson. One of these four members serves as Head Delegate. Delegations represent FPS and HSS Campuses.',
    roles: [
      ['Content Writer', 'Words that sell'],
      ['Videographer', 'Stories on screen'],
      ['Techno-wiz', 'Intelligence Behind Innovation'],
      ['Spokesperson', 'Integrity in Delivery']
    ]
  },

  /* the big numbers (number, label) */
  STATS: [
    ['104', 'Delegations'],
    ['10', 'Industries'],
    ['3', 'Events'],
    ['4', 'Roles per team']
  ],

  /* ---------------- the three events ---------------- */
  EVENTS_TITLE: 'Choose your challenge.',
  EVENTS_INTRO: 'Three events. One winner. Every IC you earn, bid or spend is Ignite Credits — event currency with no real-world monetary value.',
  EVENTS: [
    {
      no: '01 / Industry acquisition', title: 'Industry Auction', href: 'auction.html',
      text: 'Ten industries. Ten places each. Bid live against every other delegation to win the industry your business will be built in.',
      points: ['Start with 1,000 ICs', 'Bid from 50 ICs up to your balance', 'Top 10 bids per industry win']
    },
    {
      no: '02 / Your creative space', title: 'Room Booking', href: 'rooms.html',
      text: 'Put your remaining ICs to work. Reserve the Green Screen Room, Office, Library or Lounge to make your idea happen.',
      points: ['Uses your leftover auction ICs', 'Up to 15 delegations per room', 'Green Screen 150 · Office 100 · Library 75 · Lounge 50']
    },
    {
      no: '03 / Global markets', title: 'Foreign X Change', href: 'forex.html',
      text: 'A currency trading round. Read each global crisis, predict how exchange rates will move and trade your way to the most ICs.',
      points: ['Separate wallet of 2,500 ICs', 'Dollar, Euro, Yuan, Yen, Ruble, Riyal', '10 rounds · most ICs wins']
    }
  ],

  /* ---------------- The rules of the arena ----------------
     Each block: a heading + a list of rules. Add or remove lines freely. */
  RULES_TITLE: 'The rules of the arena',
  RULES: [
    {
      title: 'The basics', open: true,
      items: [
        'Every delegation has four members: a Content Writer, Videographer, Techno-wiz and Spokesperson. One of them is the Head Delegate.',
        'IC means Ignite Credits. ICs are event currency and have no real-world monetary value.',
        'Accounts are issued by the organizers. One account works on one device at a time.',
        'Delegations cannot change their login details. If you are locked out, ask your organizer.',
        'Everything updates live on your screen. You never need to refresh.'
      ]
    },
    {
      title: 'Industry Auction',
      items: [
        'Every delegation starts with 1,000 ICs.',
        'Choose from ten industries and place your bid when the organizers open an industry.',
        'The minimum bid is 50 ICs. The maximum is your current balance.',
        'The ten highest bids in each industry win a place. Equal bids are ranked by who bid first.',
        'A delegation can win one industry only.',
        'Winning bids are deducted when the organizers close the industry. Pending bids do not reserve ICs, so manage your bids carefully.',
        'Organizers open, pause and close each industry. Rankings update live while bidding is open.'
      ]
    },
    {
      title: 'Room Booking',
      items: [
        'Use the ICs you have left after the auction to reserve a room. It is the same balance.',
        'Green Screen Room (minimum 150 ICs), Office (100), Library (75) and Lounge (50).',
        'Up to 15 delegations can book each room.',
        'Delegations with no ICs left cannot book a room.',
        'Organizers open and close room booking.'
      ]
    },
    {
      title: 'Foreign X Change',
      items: [
        'Every delegation gets a separate wallet of 2,500 ICs. It is not linked to your auction ICs.',
        'Trade six currencies: Dollar, Euro, Yuan, Yen, Ruble and Riyal.',
        'There are 10 rounds. Each round the organizers show a global crisis as an image or video, and exchange rates move up or down.',
        'Buying and selling use the same rate. Buy before a currency rises and sell after to profit.',
        'You can buy as much as your cash allows and sell as much as you own.',
        'Your balance shows your profit or loss live: green when you are ahead, red when you are behind.',
        'The delegation with the most ICs after round 10 wins. Holdings count at the final round’s rates.'
      ]
    }
  ],

  /* ---------------- previous IGNITE pictures ----------------
     Put the pictures in the folder images/gallery/ and list their file names here.
     Add as many lines as you like. 'caption' is optional. */
  GALLERY_TITLE: 'Previous IGNITE',
  GALLERY_INTRO: 'Moments from earlier editions of FPS IGNITE.',
  GALLERY: [
    { file: 'gallery-01.jpg', caption: '' },
    { file: 'gallery-02.jpg', caption: '' },
    { file: 'gallery-03.jpg', caption: '' },
    { file: 'gallery-04.jpg', caption: '' },
    { file: 'gallery-05.jpg', caption: '' },
    { file: 'gallery-06.jpg', caption: '' }
  ],

  /* ---------------- Executive Council banner ---------------- */
  COUNCIL_BANNER: {
    title: 'Executive Council',
    text: 'Meet the team of students who plan, build and run IGNITE XIII.',
    photo: 'images/council-banner.jpg',   /* a wide group photo, ideally 1920 x 900 */
    button: 'See the Executive Council here'
  },

  /* ---------------- IGNITE Highlights video ----------------
     EASIEST: upload the video to YouTube as "Unlisted", then paste its ID here.
     The ID is the part after v= in the link:  youtube.com/watch?v=ABC123xyz  ->  'ABC123xyz'
     OR leave youtube empty and put a small MP4 at media/highlights.mp4 */
  HIGHLIGHTS: {
    title: 'IGNITE Highlights',
    intro: 'Relive the energy of the arena.',
    youtube: '',
    file: 'media/highlights.mp4',
    poster: 'images/highlights-poster.jpg'
  },

  /* ---------------- IGNITE Timeline ----------------
     Each step: when (date text), title, text. Add, remove or reorder lines freely.
     The numbers 1, 2, 3 ... are added for you. */
  TIMELINE_TITLE: 'IGNITE Timeline',
  TIMELINE: [
    { when: '7th & 8th October', title: 'Outreach', text: 'Questions about IGNITE? The team visits classes to answer them.' },
    { when: '9th October', title: 'Registrations open', text: 'Think you have what it takes? Register your delegation and get ready.' },
    { when: 'Date to be announced', title: 'Delegations announced', text: 'Organizers issue each delegation its account for the portal.' },
    { when: '30th October', title: 'Industry Auction', text: 'Bid live for one of the industries. 1,000 ICs to start.' },
    { when: '6th November', title: 'Foreign X Change', text: 'Ten rounds of global crisis and currency trading. Most ICs wins.' },
    { when: '6th November', title: 'Television Commercial (TVC)', text: 'Show your product to the world through your Marketing skills.' },
    { when: '7th November', title: 'Public Relations (PR) Crisis', text: 'Deal with Crisis your Business may face.' },
    { when: '7th November', title: 'Pitch to Investors', text: 'Pitch your idea to Investors who act out as the judges of the show.' },
    { when: '8th November', title: 'Corporate Courtroom', text: 'Date to be announced.' },
    { when: '8th November', title: 'Winners decided', text: 'The winning delegations are crowned.' }
  ],

  /* ---------------- Executive Council people ----------------
     Photos go in images/council/ named  first-last.jpg  (lowercase, dots removed,
     spaces become hyphens). Example: 'Kinza Junaid' -> images/council/kinza-junaid.jpg
     HOD = Head of Department, DHOD = Deputy Head of Department.
     DA is shown as 'DA'. If you want it spelled out, change 'DA' below to the full words. */
  COUNCIL_TITLE: 'Executive Council',
  COUNCIL_SUBTITLE: 'IGNITE XIII',
  COUNCIL_FEATURED: [
    { name: 'Kinza Junaid', role: 'Chief Executive Officer (CEO)' },
    { name: 'Ayaan Naqvi', role: 'Chief Operating Officer (COO)' },
    { name: 'Mifrah Faisal', role: 'Chief Financial Officer (CFO)' }
  ],
  COUNCIL_DEPARTMENTS: [
    { name: 'Registrations Department', people: [
      { name: 'Zayyan Ul Haque', role: 'Head of Department' },
      { name: 'Alyina Tejany', role: 'Deputy Head of Department' },
      { name: 'Huzaifa Saleem', role: 'DA' } ] },
    { name: 'Information Technology Department', note: 'Creator & Developer of IGNITE App', people: [
      { name: 'Daud Khan', role: 'Head of Department' },
      { name: 'Wasay Arshad', role: 'Deputy Head of Department' } ] },
    { name: 'Content & Development Department', people: [
      { name: 'Zainab Aon', role: 'Head of Department' },
      { name: 'Zainab Yasir', role: 'Deputy Head of Department' },
      { name: 'Ali Farooqui', role: 'DA' } ] },
    { name: 'Visual Media Department', people: [
      { name: 'Mishaal Fatima', role: 'Head of Department' },
      { name: 'Hunain Tahir', role: 'Deputy Head of Department' } ] },
    { name: 'Media Content Department', people: [
      { name: 'Emaan Ahmed', role: 'Head of Department' },
      { name: 'Adeena Faiz', role: 'Deputy Head of Department' },
      { name: 'Mahnoor Khurram', role: 'DA' } ] },
    { name: 'Logistics Department', people: [
      { name: 'Ibraheem Jamil', role: 'Head of Department' },
      { name: 'Khadijah Mobin', role: 'Deputy Head of Department' },
      { name: 'Sinan Haseeb', role: 'DA' } ] },
    { name: 'Finance & External Relations', people: [
      { name: 'M. Muzammil', role: 'Head of Department' },
      { name: 'Ayesha Noman', role: 'Deputy Head of Department' },
      { name: 'Hassan Raza', role: 'DA' } ] }
  ]
};
