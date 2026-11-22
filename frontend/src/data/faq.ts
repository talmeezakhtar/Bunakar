/**
 * Questions people ask, grouped. Each card has a short subject for its tab. Answers are plain text (they also feed the page's FAQPage
 * structured data) and state only what the product does today.
 */
export type FaqGroup = { id: string; title: string; items: { tab: string; q: string; a: string }[] }

export const FAQ: FaqGroup[] = [
  {
    id: 'plans',
    title: 'Plans',
    items: [
      { tab: 'Free', q: 'Is Bunakar free?', a: 'Yes. Designing is free, with or without an account. A free account keeps up to 5 designs and downloads images up to 1200px with a small Bunakar mark.' },
      { tab: 'Pro', q: 'What does Pro add?', a: "Unlimited saved designs, full-size images with no mark, and the files a workshop works from: the weaver's chart for knotted, flatwoven and needlepoint rugs, full-scale templates for tufted rugs and tile maps for tile rugs." },
      { tab: 'Paying', q: 'How much is Pro, and how do I pay?', a: "₹499 a month, or ₹3,999 a year (about ₹333 a month). Online payment isn't open yet: join the Pro list on the pricing page and we'll email you to set it up. You're not charged anything until then." },
      { tab: 'Cancelling', q: 'Can I cancel Pro?', a: 'Yes, any time. You keep Pro until the end of the period you paid for. See the cancellation and refund policy for details.' },
      { tab: 'Going back', q: 'What happens to my designs if I go back to Free?', a: 'They stay on your account and you can open, preview and edit them. Saving new designs needs room under the Free limit of 5.' },
    ],
  },
  {
    id: 'designing',
    title: 'Designing',
    items: [
      { tab: 'Crafts', q: 'What kinds of rug can I design?', a: 'Hand-knotted, flatweave (kilim, soumak and dhurrie), hand-tufted, hand-hooked, braided, needlepoint and modular tile rugs, all in one Studio. Pick how it is made when you start, and the Studio opens with the right tools for it.' },
      { tab: 'Knot chart', q: 'How does a knotted rug work in the Studio?', a: 'You draw on a knot chart, the way weavers do: every square is one knot, at 40 to 225 knots a square inch. Mirror it across, down or in quarters, set borders, corners, a medallion or a repeat, and stamp motifs from the catalogue.' },
      { tab: 'Styles', q: 'Can I start from a classic style?', a: 'Yes. Twenty styles set the whole layout in their own yarns, among them Heriz, Kashan, Tabriz, Oushak, Baluch, a prayer rug, a garden carpet, kilims, a Navajo eye-dazzler and ikat. Everything stays editable.' },
      { tab: 'Photos', q: 'Can I turn a photo into a rug?', a: 'Yes. Upload a photo, mark its four corners to straighten it, and choose 4 to 32 yarns. The Studio turns it into a knot chart in real catalogue yarns that you can then edit. Use only photos you have the rights to.' },
      { tab: 'Freehand', q: 'What about tufted, hooked and tile rugs?', a: 'Tufted and hooked rugs are drawn freehand: shapes in any outline, each with its own pile (cut, loop, high-low, shag) and carved lines. Tile rugs are laid in 18-inch tiles in ten cuts, with medallions and borders on top.' },
      { tab: 'Sizes', q: 'How big can a rug be?', a: 'Up to 60 feet a side, as a rectangle, runner, round, oval or octagon. Borders and layouts follow the shape, so a round rug gets round borders.' },
      { tab: 'Guests', q: 'Do I need an account to design?', a: 'No. Design as a guest and your work is kept in this browser. Sign in when you want to save it to your account, share a link or use it on another device.' },
      { tab: 'Rooms', q: 'Can I see the rug in a room?', a: 'Yes. Every design can be turned in 3D and seen in ten rooms (living rooms, bedrooms, a dining room, hallways, a study, a reading corner and a hotel lobby), each built around the rug at its real size.' },
      { tab: 'Older designs', q: 'What happened to my designs from the earlier designers?', a: 'They open in the Studio. Saving makes a new Studio rug; your original stays in My Designs.' },
    ],
  },
  {
    id: 'making',
    title: 'Getting it made',
    items: [
      { tab: 'Workshops', q: 'Does Bunakar make or sell rugs?', a: 'No. Bunakar is a design studio. Your designs are yours to take to any weaver or workshop you choose.' },
      { tab: 'Charts', q: "What is a weaver's chart?", a: 'A printable chart of every knot or stitch, paged so each sheet is easy to work from, with rows and columns numbered, a symbol and code for each yarn, the knot count per yarn and an estimate of the yarn weight. A quarter-symmetric rug can be printed as one quarter.' },
      { tab: 'Templates', q: 'What do tufted and tile rugs come with?', a: 'Tufted and hooked rugs get a full-scale template: every shape outlined and labelled, with a yarn legend of colours, finishes and areas. Tile rugs get a tile map with each tile labelled, its colour code and cut, and a wool list.' },
      { tab: 'Colours', q: 'Will the colours match the real wool?', a: 'Screens show colours differently, so treat on-screen colours as a guide. Ask your weaver for physical swatches of the codes on your chart before they start.' },
    ],
  },
  {
    id: 'account',
    title: 'Account and privacy',
    items: [
      { tab: 'Your data', q: 'What do you store about me?', a: "Your name, email, a securely hashed password, your plan and the designs you save. The privacy policy has the details." },
      { tab: 'Privacy', q: 'Are my designs private?', a: 'Yes. Only you see your saved designs, unless you share a preview link, which anyone with the link can open (read only).' },
      { tab: 'Deleting', q: 'How do I delete my account?', a: 'Write to us from the contact page with the email you signed up with and we will delete your account and designs.' },
    ],
  },
]
