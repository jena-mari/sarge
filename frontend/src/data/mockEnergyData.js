export const user={id:'D001',firstName:'Bella',suburb:'Dapto',donorType:'household',solarCapacityKw:6.6,credits:85};
export const currentMonth={generatedKwh:160,consumedKwh:74,spareKwh:86,contributedKwh:85,availableKwh:1,householdsSupported:4};
export const demoVerification={verified_export_today:8.4,estimated_weekly_export:42,verification_method:'demo_smart_meter_data'};
export const defaultWeeklyDonationCap=22;
export const energyHistory=[
 {month:'Mar',generated:132,used:81,spare:51,contributed:43},
 {month:'Apr',generated:141,used:78,spare:63,contributed:55},
 {month:'May',generated:150,used:80,spare:70,contributed:62},
 {month:'Jun',generated:138,used:84,spare:54,contributed:49},
 {month:'Jul',generated:151,used:79,spare:72,contributed:65},
 {month:'Aug',generated:160,used:74,spare:86,contributed:85},
];
export const rewards=[
 {category:'Getting around',title:'1 Hour Council Parking',description:'A proposed credit toward participating Wollongong parking locations.',cost:50},
 {category:'Health & movement',title:'Leisure Centre Benefit',description:'A proposed entry or class credit at a participating local centre.',cost:80},
 {category:'Shop local',title:'Local Business Voucher',description:'A proposed voucher for a participating Wollongong business.',cost:100},
 {category:'Give it forward',title:'Donate Credits Back',description:'Return credits to support future community energy initiatives.',cost:25},
 {category:'Recognition',title:'Sustainability Recognition',description:'A shareable record recognising your renewable contribution.',cost:40},
 {category:'Community',title:'Contributor Badge',description:'A low-key acknowledgement for neighbours who consistently contribute.',cost:60},
];
export const calculateSpareEnergy=(generated,consumed)=>Math.max(0,generated-consumed);
export const calculateContribution=(pledge,verifiedSpare)=>Math.min(Math.max(0,pledge),verifiedSpare);
export const calculateSargeCredits=(contributedKwh)=>contributedKwh;
