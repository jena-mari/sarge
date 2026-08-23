export const pool = {
  totalCapacityKwh: 12480,
  availableNowKwh: 3842,
  reserveKwh: 1260,
  runwayHours: 18.4,
  predictedDemandKwh: 2960,
  activeContributors: 438,
  householdsSupported: 126,
};

export const incomingSources = [
  { id:'D001', property:'Bella residence', suburb:'Dapto', type:'Household', capacity:6.6, current:4.8, today:26.2, health:98, status:'Online', updated:'18 sec ago' },
  { id:'A014', property:'Harbour View Apartments', suburb:'Wollongong', type:'Apartment', capacity:42, current:31.4, today:184.6, health:94, status:'Online', updated:'25 sec ago' },
  { id:'B032', property:'Illawarra Foods', suburb:'Unanderra', type:'Business', capacity:78, current:52.8, today:318.1, health:91, status:'Online', updated:'41 sec ago' },
  { id:'C008', property:'Dapto Library', suburb:'Dapto', type:'Council', capacity:18.5, current:10.2, today:72.4, health:87, status:'Review', updated:'2 min ago' },
  { id:'D119', property:'Fernhill residence', suburb:'Corrimal', type:'Household', capacity:5.2, current:0, today:11.8, health:62, status:'Offline', updated:'38 min ago' },
  { id:'B051', property:'Portside Workshops', suburb:'Port Kembla', type:'Business', capacity:54, current:39.6, today:244.7, health:96, status:'Online', updated:'12 sec ago' },
];

export const outgoingAllocations = [
  { id:'R-2041', household:'H0812', suburb:'Warrawong', current:2.4, today:11.8, allocation:'Priority support', source:'Contribution pool', status:'Allocated' },
  { id:'R-2038', household:'H0441', suburb:'Cringila', current:1.8, today:8.6, allocation:'Standard support', source:'Contribution pool', status:'Allocated' },
  { id:'R-2035', household:'H0674', suburb:'Bellambi', current:2.1, today:10.2, allocation:'Priority support', source:'Contribution pool', status:'Allocated' },
  { id:'R-2029', household:'H0198', suburb:'Berkeley', current:0.9, today:6.4, allocation:'Standard support', source:'Reserve', status:'Scheduled' },
  { id:'R-2024', household:'H0733', suburb:'Port Kembla', current:1.5, today:7.9, allocation:'Priority support', source:'Contribution pool', status:'Allocated' },
];

export const energyRequests = [
  { id:'REQ-4812', household:'H0812', suburb:'Warrawong', requested:18, window:'Today, 4–10pm', reason:'High evening load', priority:'High', confidence:96, status:'Validated' },
  { id:'REQ-4811', household:'H0316', suburb:'Lake Heights', requested:12, window:'Today, 5–9pm', reason:'Essential appliance load', priority:'High', confidence:94, status:'Validated' },
  { id:'REQ-4808', household:'H0674', suburb:'Bellambi', requested:9, window:'Tomorrow, 7–11am', reason:'Forecast shortfall', priority:'Standard', confidence:91, status:'Pending review' },
  { id:'REQ-4804', household:'H0522', suburb:'Berkeley', requested:7, window:'Tomorrow, 4–8pm', reason:'Forecast shortfall', priority:'Standard', confidence:88, status:'Pending review' },
];

export const creditAllocations = [
  { owner:'D001', type:'Household', suburb:'Dapto', contributed:85, rate:1, credits:85, adjustment:0, status:'Calculated' },
  { owner:'A014', type:'Apartment', suburb:'Wollongong', contributed:612, rate:1, credits:612, adjustment:24, status:'Review' },
  { owner:'B032', type:'Business', suburb:'Unanderra', contributed:980, rate:1, credits:980, adjustment:0, status:'Calculated' },
  { owner:'C008', type:'Council', suburb:'Dapto', contributed:204, rate:1, credits:204, adjustment:0, status:'Calculated' },
];

export const infrastructure = [
  { name:'Dapto Community Hub', kind:'Local hub', load:64, voltage:'239 V', frequency:'50.01 Hz', latency:'42 ms', health:97, status:'Healthy' },
  { name:'Port Kembla Hub', kind:'Local hub', load:81, voltage:'241 V', frequency:'49.98 Hz', latency:'55 ms', health:91, status:'Healthy' },
  { name:'Northern Suburbs Hub', kind:'Local hub', load:72, voltage:'238 V', frequency:'50.03 Hz', latency:'47 ms', health:94, status:'Healthy' },
  { name:'Grid Interface G-04', kind:'Grid interface', load:88, voltage:'11.1 kV', frequency:'49.96 Hz', latency:'31 ms', health:84, status:'Monitor' },
  { name:'Reserve Battery R-02', kind:'Storage', load:46, voltage:'804 V', frequency:'—', latency:'38 ms', health:89, status:'Healthy' },
];

export const hourlyFlow = [
  { time:'6am', incoming:180, outgoing:90 }, { time:'8am', incoming:420, outgoing:210 },
  { time:'10am', incoming:760, outgoing:290 }, { time:'12pm', incoming:940, outgoing:380 },
  { time:'2pm', incoming:860, outgoing:430 }, { time:'4pm', incoming:610, outgoing:520 },
  { time:'6pm', incoming:280, outgoing:670 }, { time:'8pm', incoming:80, outgoing:540 },
];
