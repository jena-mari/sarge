'use client';
/* eslint-disable @next/next/no-img-element */

import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Check, ChevronLeft, Download, FileText, Home, Menu, Users, X, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { defaultWeeklyDonationCap, demoVerification, energyHistory, user, calculateSargeCredits } from '../src/data/mockEnergyData';
import CouncilDashboard from '../../council-frontend/app/CouncilDashboard';
import PriorityDemo from '../algorithm/demo/PriorityDemo';
import Methodology from '../algorithm/docs/Methodology';

const Button = ({ children, variant = 'dark', className = '', ...props }) => <button className={`button button--${variant} ${className}`} {...props}>{children}</button>;
const StepDots = ({ active, total = 5 }) => <div className="step-dots" aria-label={`Step ${active} of ${total}`}>{Array.from({length:total},(_,i)=><span key={i} className={i<active?'active':''}/>)}</div>;
const heroAssets = {
  background: '/assets/figma/welcoming-bg.jpg',
  mark: '/assets/figma/sarge-lightning-mark.png?v=clean-icon',
  divider: '/assets/figma/logo-divider-figma.svg',
  family: '/assets/figma/sarge-family-figma.png',
};
const donorPropertyTypes = [['Home',Home],['Apartment Building',Building2],['Business',Building2],['Council Property',Building2]];
const donorTypeMap = {'Home':'household','Apartment Building':'apartment_building','Business':'business','Council Property':'council_property'};
const wollongongSuburbs = [
  'Austinmer',
  'Avon',
  'Avondale',
  'Balgownie',
  'Bellambi',
  'Berkeley',
  'Brownsville',
  'Bulli',
  'Cataract',
  'Cleveland',
  'Clifton',
  'Coalcliff',
  'Coledale',
  'Coniston',
  'Cordeaux',
  'Cordeaux Heights',
  'Corrimal',
  'Cringila',
  'Dapto',
  'Darkes Forest',
  'Dombarton',
  'East Corrimal',
  'Fairy Meadow',
  'Farmborough Heights',
  'Fernhill',
  'Figtree',
  'Gwynneville',
  'Haywards Bay',
  'Helensburgh',
  'Horsley',
  'Huntley',
  'Kanahooka',
  'Keiraville',
  'Kembla Grange',
  'Kembla Heights',
  'Koonawarra',
  'Lake Heights',
  'Lilyvale',
  'Maddens Plains',
  'Mangerton',
  'Marshall Mount',
  'Mount Keira',
  'Mount Kembla',
  'Mount Ousley',
  'Mount Pleasant',
  'Mount St Thomas',
  'North Wollongong',
  'Otford',
  'Penrose',
  'Port Kembla',
  'Primbee',
  'Russell Vale',
  'Scarborough',
  'Spring Hill',
  'Stanwell Park',
  'Stanwell Tops',
  'Tarrawanna',
  'Thirroul',
  'Towradgi',
  'Unanderra',
  'Warrawong',
  'West Wollongong',
  'Windang',
  'Wollongong',
  'Wombarra',
  'Wongawilli',
  'Woonona',
  'Yallah',
];
const consentItems = [
 ['located_in_wollongong_lga','Property is in the Wollongong Council area.'],
 ['has_export_source','Property has rooftop solar, battery export, or another eligible export source.'],
 ['has_verifiable_export_data','Export data can be verified through a smart meter, inverter, VPP, retailer report, or uploaded CSV.'],
 ['export_data_consent','Contributor agrees SARGE can use export data to verify donated kWh.'],
];
const demoDataSourcePayload = {network:'Endeavour Energy',has_smart_meter:'yes',verification_method:'demo_smart_meter_data',uploaded_export_file_name:null,retailer:null,inverter_or_vpp_provider:null,verified_export_today:8.4,estimated_weekly_export:42};
const retailerOptions = ['AGL','Origin Energy','EnergyAustralia','Red Energy','Alinta Energy','Simply Energy','Powershop','Other','Not sure'];
const inverterOrVppProviderOptions = ['SolarEdge','Fronius','Enphase','Tesla','Sungrow','GoodWe','Growatt','SMA','Amber VPP','sonnen','Other','Not sure'];
const dataSourceOptions = [
 {id:'demo_smart_meter_data',title:'Use demo smart meter data',badge:'Recommended',description:'Creates sample verified export data for the prototype.',Icon:Check},
 {id:'upload_csv',title:'Upload smart meter CSV',description:'Upload an export report from a smart meter or retailer.',Icon:FileText},
 {id:'retailer_cdr',title:'Connect retailer / CDR later',description:'Choose your electricity retailer for a future consent-based connection.',Icon:Zap},
 {id:'inverter_vpp',title:'Connect inverter or VPP later',description:'Choose your solar inverter, battery, or VPP provider.',Icon:Building2},
];
const civicRewardRates = [
 {credits:'20 credits',reward:'1 hour parking'},
 {credits:'100 credits',reward:'$5 leisure voucher'},
 {credits:'300 credits',reward:'green waste voucher'},
];
const emptyConsent = consentItems.reduce((acc,[key])=>({...acc,[key]:false}),{});
const readStoredJson = (key, fallback) => { if (typeof window === 'undefined') return fallback; try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const readStoredNumber = (key, fallback = 0) => {
 if (typeof window === 'undefined') return fallback;
 try {
  const value = Number(JSON.parse(localStorage.getItem(key)));
  return Number.isFinite(value) ? value : fallback;
 } catch {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
 }
};
const clearStoredValue = key => { if (typeof window !== 'undefined') localStorage.removeItem(key); };
const clampWeeklyCap = (value, max) => Math.min(Math.max(0, Number(value) || 0), max);
const formatKwh = value => Number(value).toLocaleString(undefined,{maximumFractionDigits:1});
const formatVerificationMethod = method => method === 'demo_smart_meter_data' ? 'Demo smart meter data' : String(method || 'demo_smart_meter_data').replace(/_/g,' ');
const supportFlowSteps = ['Location and household','Housing and solar access','Energy bill snapshot','Support and rebate status','Income band','Priority needs','Consent','Submitted'];
const supportHousingOptions = [
 {value:'renter',label:'Renter'},
 {value:'owner',label:'Owner'},
 {value:'apartment',label:'Apartment'},
 {value:'social_housing',label:'Social housing'},
 {value:'other',label:'Other'},
];
const supportNoSolarReasons = [
 {value:'renting',label:'Renting'},
 {value:'apartment',label:'Apartment'},
 {value:'no_roof_access',label:'No roof access'},
 {value:'too_expensive',label:'Too expensive'},
 {value:'unsure',label:'Not sure'},
];
const supportRebateOptions = ['Low Income Household Rebate','Family Energy Rebate','Seniors Energy Rebate','Medical Energy Rebate','Life Support Rebate','EAPA','None','Not sure'];
const supportIncomeBands = ['Under $500/week','$500-$999/week','$1000-$1499/week','$1500+/week','Prefer not to say'];
const supportHighNeedSuburbs = new Set(['Warrawong','Cringila','Berkeley','Port Kembla','Lake Heights','Bellambi']);
const defaultSupportForm = {
 recipientId:'R001',
 contactEmail:'alex.support@sarge.demo',
 suburb:'Warrawong',
 postcode:'2502',
 householdSize:3,
 livesInWollongong:null,
 housingType:'renter',
 hasRooftopSolar:false,
 noSolarReason:'renting',
 averageBillAmount:180,
 billingPeriod:'monthly',
 strugglingToPay:true,
 billOverdue:true,
 billUploadedFileName:null,
 rebateTypes:['Low Income Household Rebate','EAPA'],
 hardshipProgram:true,
 incomeBand:'$500-$999/week',
 lifeSupportFlag:false,
 priorityHousehold:true,
 disconnectionWarning:false,
 consentInfo:false,
 consentPilot:false,
};
const supportIncomeGapScore = band => ({'Under $500/week':1,'$500-$999/week':0.72,'$1000-$1499/week':0.42,'$1500+/week':0.16,'Prefer not to say':0.5}[band] ?? 0.5);
const supportHousingLabel = value => supportHousingOptions.find(option=>option.value===value)?.label || value;
const makeSupportPayload = form => {
 const receivesEnergyRebate=form.rebateTypes.some(rebate=>rebate!=='None'&&rebate!=='Not sure');
 const solarAccessGap=!form.hasRooftopSolar || ['renter','apartment','social_housing'].includes(form.housingType);
 const monthlyBill=form.billingPeriod==='quarterly' ? Number(form.averageBillAmount)/3 : Number(form.averageBillAmount);
 const paymentDifficulty=Math.min(1,(form.strugglingToPay?0.42:0)+(form.billOverdue?0.34:0)+(form.hardshipProgram?0.18:0)+(form.disconnectionWarning?0.25:0));
 const householdSize=Number(form.householdSize)||1;
 const demandCapKwh=Number(Math.min(14,4+(householdSize*.8)+(form.priorityHousehold?1.5:0)+(form.lifeSupportFlag?2:0)+(form.disconnectionWarning?1:0)).toFixed(1));
 return {
  recipient_id:form.recipientId,
  contact_email:form.contactEmail,
  suburb:form.suburb,
  postcode:form.postcode,
  household_size:householdSize,
  lives_in_wollongong_lga:form.livesInWollongong,
  housing_type:form.housingType,
  has_rooftop_solar:form.hasRooftopSolar,
  no_solar_reason:form.hasRooftopSolar ? null : form.noSolarReason,
  average_bill_amount:Number(form.averageBillAmount)||0,
  billing_period:form.billingPeriod,
  struggling_to_pay:form.strugglingToPay,
  bill_overdue:form.billOverdue,
  rebate_types:form.rebateTypes,
  hardship_program:form.hardshipProgram,
  income_band:form.incomeBand,
  life_support_flag:form.lifeSupportFlag,
  priority_household:form.priorityHousehold,
  disconnection_warning:form.disconnectionWarning,
  consent:form.consentInfo&&form.consentPilot,
  receives_energy_rebate:receivesEnergyRebate,
  solar_access_gap:solarAccessGap,
  income_gap:supportIncomeGapScore(form.incomeBand),
  area_disadvantage:supportHighNeedSuburbs.has(form.suburb) ? 1 : 0.38,
  payment_difficulty:Number(paymentDifficulty.toFixed(2)),
  energy_burden:Number(Math.min(1,monthlyBill/260).toFixed(2)),
  no_solar_access:solarAccessGap ? 1 : 0,
  is_high_need_area:supportHighNeedSuburbs.has(form.suburb) ? 1 : 0,
  demandCapKwh,
 };
};

function Logo() { return <NavLink className="logo" to="/overview" aria-label="Sarge home"><Zap size={24} fill="currentColor" strokeWidth={3}/><strong>Sarge</strong></NavLink>; }

function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [['/overview','Overview'],['/contribute','Contribute'],['/rewards','Rewards'],['/reports','Reports']];
  return <header className="nav-wrap"><nav className="navbar" aria-label="Main navigation"><Logo/><div className={`nav-links ${open ? 'is-open' : ''}`}>{links.map(([to,label]) => <NavLink key={to} to={to} onClick={()=>setOpen(false)}>{label}</NavLink>)}<a className="contact-mobile" href="mailto:hello@sarge.community">Contact Us</a></div><a className="button button--dark contact" href="mailto:hello@sarge.community">Contact Us</a><button className="menu" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">{open?<X/>:<Menu/>}</button></nav></header>;
}

function Shell({ children, title, eyebrow }) { return <><Navbar/><main className="page"><div className="page-title">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div>{children}</main></>; }

function EnergyFlow({ compact = false }) {
  const steps = [
    ['Generated',160,'Total solar produced','generated'],
    ['Used',74,'By my property','used'],
    ['Spare energy',86,'Verified from connected data','spare'],
    ['Contributed',85,'Shared with the community pool','contributed'],
  ];
  return <div className={`energy-flow ${compact?'energy-flow--compact':''}`} aria-label="160 kilowatt hours generated, 74 used, 86 spare, 85 contributed">{steps.map(([label,value,caption,type],i)=><div className={`energy-step ${type}`} key={label}><span className="step-index">0{i+1}</span><p>{label}</p><strong>{value}<small> kWh</small></strong><span>{caption}</span>{i<steps.length-1 && <ArrowRight className="flow-arrow" aria-hidden="true"/>}</div>)}</div>;
}

function ReportGenerator({ inline = false }) {
  const [period,setPeriod]=useState('This month'); const [generated,setGenerated]=useState(false);
  const download=()=>{const rows=['Metric,Value','Solar generated,160 kWh','Property consumption,74 kWh','Spare energy,86 kWh','Energy contributed,85 kWh','Sarge Credits earned,85','Households supported,4','Estimated community benefit,$26']; const blob=new Blob([rows.join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sarge-energy-report.csv'; a.click(); URL.revokeObjectURL(a.href)};
  return <section className={`report-card ${inline?'report-card--inline':''}`}><div className="report-icon"><FileText/></div><p className="eyebrow">Reports</p><h2>Your Energy Report</h2><p>See where your solar went and the impact it created.</p><div className="segmented" aria-label="Report period">{['This month','Last 3 months','Last 6 months','Custom'].map(x=><button key={x} className={period===x?'active':''} onClick={()=>{setPeriod(x);setGenerated(false)}}>{x}</button>)}</div>{generated?<div className="report-preview"><div><span>Generated</span><strong>160 kWh</strong></div><div><span>Used</span><strong>74 kWh</strong></div><div><span>Spare</span><strong>86 kWh</strong></div><div><span>Contributed</span><strong>85 kWh</strong></div><div><span>Credits earned</span><strong>85</strong></div><div><span>Households supported</span><strong>4</strong></div><div className="benefit"><span>Estimated community benefit</span><strong>$26</strong></div></div>:<div className="report-placeholder"><span>{period}</span><div className="report-line"/><div className="report-line short"/><p>Your report will turn your energy data into a simple, downloadable summary.</p></div>}<Button onClick={()=>generated?download():setGenerated(true)}>{generated?<><Download size={18}/> Download report</>:<>Generate report <ArrowRight size={18}/></>}</Button></section>;
}

function Overview() {
  const [creditsJustAdded]=useState(()=>readStoredNumber('sargeJustConfirmedCredits',0));
  useEffect(()=>{if(creditsJustAdded>0)clearStoredValue('sargeJustConfirmedCredits')},[creditsJustAdded]);
  return <Shell title="Your Sarge Overview" eyebrow={`Hi, ${user.firstName}!`}><div className="overview-grid"><section className="overview-left"><h2>My Sarge</h2><div className="credit-card"><span>Current balance</span><strong>85</strong><h3>Sarge Credits</h3>{creditsJustAdded>0&&<div className="credit-card__added">NEW +{formatKwh(creditsJustAdded)}</div>}<p>+24 this month</p><NavLink className="button button--light" to="/rewards">Use my credits <ArrowRight size={18}/></NavLink></div><div className="impact-note"><Users/><p>Your energy supported <strong>4 households</strong> this month.</p></div></section><ReportGenerator inline/><section className="energy-panel"><p className="eyebrow">August 2026</p><h2>My Energy</h2><EnergyFlow/><div className="still-available"><span>Still available</span><strong>1 kWh</strong></div></section></div></Shell>;
}

function Contribute() {
 const nav=useNavigate();
 const verification=readStoredJson('sargeVerification',{...demoVerification,home_battery:'Not sure',verified:true});
 const draft=readStoredJson('sargeOnboardingDraft',{property:'Home',suburb:'Dapto',system_size_kw:6.6,donor_type:'household'});
 const eligibilityConsent=readStoredJson('sargeEligibilityConsent',{...emptyConsent,consented_at:''});
 const verifiedExportToday=Number(verification.verified_export_today ?? demoVerification.verified_export_today);
 const estimatedWeeklyExport=Number(verification.estimated_weekly_export ?? demoVerification.estimated_weekly_export);
 const homeBattery=verification.home_battery || 'Not sure';
 const [weeklyCap,setWeeklyCap]=useState(Number(verification.weekly_donation_cap ?? defaultWeeklyDonationCap));
 const [reserve,setReserve]=useState(homeBattery==='Yes');
 const weeklyDonationCap=clampWeeklyCap(weeklyCap,estimatedWeeklyExport);
 const creditsToday=Math.min(verifiedExportToday,weeklyDonationCap);
 const weeklyCapRemainingAfterToday=Math.max(weeklyDonationCap-creditsToday,0);
 const updateWeeklyCap=value=>setWeeklyCap(clampWeeklyCap(value,estimatedWeeklyExport));
 const confirm=()=>{const payload={donor_id:'D001',donor_type:draft.donor_type || donorTypeMap[draft.property] || 'household',suburb:draft.suburb || 'Dapto',verified_export_today:verifiedExportToday,estimated_weekly_export:estimatedWeeklyExport,weekly_donation_cap:weeklyDonationCap,weekly_cap_remaining_after_today:weeklyCapRemainingAfterToday,remaining_weekly_cap:weeklyCapRemainingAfterToday,credits_created_today:creditsToday,pledged_kwh:weeklyDonationCap,verified_spare_kwh:verifiedExportToday,contributed_kwh:creditsToday,sarge_credits_created:calculateSargeCredits(creditsToday),verification_method:verification.verification_method || demoVerification.verification_method,home_battery:homeBattery,battery_reserve_required:homeBattery==='Yes'&&reserve,eligibility_consent:eligibilityConsent,status:'verified',verified:true};localStorage.setItem('sargeContribution',JSON.stringify(payload));localStorage.setItem('sargeVerification',JSON.stringify({...verification,weekly_donation_cap:weeklyDonationCap,weekly_cap_remaining_after_today:weeklyCapRemainingAfterToday}));nav('/confirm-donation')};
 return <Shell title="Share your spare solar" eyebrow="Pledge"><div className="contribute-layout"><section><div className="today-flow"><div><span>Verified export today</span><strong>{formatKwh(verifiedExportToday)} kWh</strong></div><ArrowRight/><div><span>Weekly donation cap</span><strong>{formatKwh(weeklyDonationCap)} kWh</strong></div><ArrowRight/><div className="pink"><span>Today’s SARGE Credits</span><strong>{formatKwh(creditsToday)}</strong></div></div>{homeBattery==='Yes'&&<label className={`choice reserve-choice ${reserve?'selected':''}`}><input type="checkbox" checked={reserve} onChange={e=>setReserve(e.target.checked)}/><span>Only donate after battery reserve is met</span>{reserve&&<Check/>}</label>}</section><section className="pledge-card"><h2>Weekly donation cap</h2><div className="slider-wrap"><label htmlFor="weekly-cap">Maximum donated solar this week</label><input id="weekly-cap" type="range" min="0" max={estimatedWeeklyExport} step="1" value={weeklyDonationCap} onChange={e=>updateWeeklyCap(e.target.value)}/><div className="number-field"><input aria-label="Weekly donation cap" type="number" min="0" max={estimatedWeeklyExport} value={weeklyDonationCap} onChange={e=>updateWeeklyCap(e.target.value)}/><span>kWh</span></div></div><div className="calculation"><span>Estimated weekly export</span><strong>{formatKwh(estimatedWeeklyExport)} kWh</strong><span>Verified export today</span><strong>{formatKwh(verifiedExportToday)} kWh</strong><span>Weekly donation cap</span><strong>{formatKwh(weeklyDonationCap)} kWh</strong><span>Today’s SARGE Credits</span><strong>{formatKwh(creditsToday)}</strong><span>Weekly cap remaining after today</span><strong>{formatKwh(weeklyCapRemainingAfterToday)} kWh</strong></div><Button onClick={confirm} disabled={creditsToday<=0}>Review donation <ArrowRight size={18}/></Button></section></div></Shell>;
}

function ConfirmDonationSummary({ propertyLabel, verifiedBy, verifiedExportToday, weeklyDonationCap, creditsCreated, onConfirm, showButton = false }) {
 return <><div className="confirm-donation-grid"><article><span>Property</span><strong>{propertyLabel}</strong></article><article><span>Weekly donation cap</span><strong>{formatKwh(weeklyDonationCap)} kWh / week</strong></article><article className="confirm-donation-conversion"><span>Today’s verified conversion</span><div className="confirm-donation-equation"><div><strong>{formatKwh(verifiedExportToday)} kWh</strong><small>verified export</small></div><b>=</b><div><strong>{formatKwh(creditsCreated)}</strong><small>SARGE Credits</small></div></div></article><article className="confirm-donation-verified"><span>Verification method</span><strong>{verifiedBy}</strong></article></div><article className="confirm-donation-info"><h2>Civic reward rates</h2><div className="civic-rate-grid">{civicRewardRates.map(item=><div className="civic-rate-tile" key={item.credits}><strong>{item.credits}</strong><b>=</b><small>{item.reward}</small></div>)}</div></article><p className="confirm-donation-reassurance">You can change or stop your donation pledge anytime.</p>{showButton&&<Button onClick={onConfirm}>Confirm donation <ArrowRight size={18}/></Button>}</>;
}

function ConfirmDonation() {
 const nav=useNavigate();
 const draft=readStoredJson('sargeOnboardingDraft',{property:'Home',suburb:'Dapto',system_size_kw:6.6,donor_type:'household'});
 const contribution=readStoredJson('sargeContribution',{donor_type:draft.donor_type,property_type:draft.property,suburb:draft.suburb,verified_export_today:demoVerification.verified_export_today,weekly_donation_cap:defaultWeeklyDonationCap,credits_created_today:demoVerification.verified_export_today,verification_method:demoVerification.verification_method});
 const verifiedExportToday=Number(contribution.verified_export_today ?? demoVerification.verified_export_today);
 const weeklyDonationCap=Number(contribution.weekly_donation_cap ?? defaultWeeklyDonationCap);
 const creditsCreated=Number(contribution.credits_created_today ?? contribution.sarge_credits_created ?? 0);
 const confirm=()=>{localStorage.setItem('sargeOnboardingComplete','true');localStorage.setItem('sargeJustConfirmedCredits',JSON.stringify(creditsCreated));nav('/overview')};
 return <Shell title="Confirm Donation" eyebrow="Confirm Donation"><section className="confirm-donation-card"><ConfirmDonationSummary propertyLabel={`${contribution.property_type || draft.property || 'Home'} in ${contribution.suburb || draft.suburb || 'Dapto'}`} verifiedBy={formatVerificationMethod(contribution.verification_method)} verifiedExportToday={verifiedExportToday} weeklyDonationCap={weeklyDonationCap} creditsCreated={creditsCreated} onConfirm={confirm} showButton/></section></Shell>;
}

function Rewards() {
 const creditBalance = 85;
 const lifetimeCredits = 240;
 const rewardsList = [
  {title: 'Parking Credit', cost: 20, value: '1 hour council parking', cap: 'Monthly cap: 80 credits / 4 hours'},
  {title: 'Leisure Credit', cost: 100, value: '$5 leisure centre credit', cap: 'Monthly cap: 200 credits / $10'},
  {title: 'Green Waste Voucher', cost: 300, value: '$19 green waste voucher', cap: 'Monthly cap: 1 voucher'},
 ];
 const badgeProgress = Math.min(100, Math.round((lifetimeCredits / 300) * 100));

 return <><Navbar/><main className="page rewards-page">
  <header className="rewards-compact-title">
   <p className="eyebrow">Rewards</p>
   <h1>SARGE Credits</h1>
  </header>

  <section className="rewards-section credit-balance-section" aria-labelledby="credit-balance-title">
   <div>
    <span className="rewards-section-label">Credit Balance</span>
    <h2 id="credit-balance-title"><strong>{creditBalance}</strong> SARGE Credits available</h2>
    <p>1 SARGE Credit = 1 verified exported kWh</p>
   </div>
   <dl>
    <div>
     <dt>Lifetime credits</dt>
     <dd>{lifetimeCredits}</dd>
    </div>
   </dl>
  </section>

  <section className="rewards-section" aria-labelledby="redeem-title">
   <div className="rewards-section-head">
    <span className="rewards-section-label">Redeem Civic Rewards</span>
    <h2 id="redeem-title">Choose a council reward</h2>
   </div>
   <div className="civic-reward-grid">
    {rewardsList.map(reward => {
     const available = creditBalance >= reward.cost;
     const away = Math.max(0, reward.cost - creditBalance);
     return <article className={`civic-reward-card ${available ? 'available' : ''}`} key={reward.title}>
      <div>
       <span>{reward.cost} credits</span>
       <h3>{reward.title}</h3>
       <p>{reward.cost} credits = {reward.value}</p>
      </div>
      <small>{reward.cap}</small>
      {available ? <button className="button" type="button">Redeem</button> : <strong>{away} credits away</strong>}
     </article>;
    })}
   </div>
  </section>

  <section className="rewards-section recognition-section" aria-labelledby="recognition-title">
   <div className="rewards-section-head">
    <span className="rewards-section-label">Contributor Recognition</span>
    <h2 id="recognition-title">Silver Solar Neighbour</h2>
    <p>Badges are automatic recognition based on lifetime credits.</p>
   </div>
   <div className="badge-levels" aria-label="Badge levels">
    <span>Bronze <b>50</b></span>
    <span className="active">Silver <b>150</b></span>
    <span>Gold <b>300</b></span>
   </div>
   <div className="badge-progress-row">
    <span>{lifetimeCredits} / 300 to Gold</span>
    <div className="badge-progress" aria-label={`${lifetimeCredits} of 300 lifetime credits toward Gold`}>
     <i style={{width: `${badgeProgress}%`}}/>
    </div>
   </div>
  </section>
 </main></>;
}

function Reports() { const totals=energyHistory.reduce((a,x)=>({generated:a.generated+x.generated,used:a.used+x.used,spare:a.spare+x.spare,contributed:a.contributed+x.contributed}),{generated:0,used:0,spare:0,contributed:0}); return <Shell title="Your energy, clearly explained." eyebrow="Reports"><div className="reports-toolbar"><div><h2>Six-month report</h2><p>March–August 2026</p></div><div className="segmented">{['Monthly','Quarterly','Six months','Custom'].map((x,i)=><button className={i===2?'active':''} key={x}>{x}</button>)}</div><Button><Download size={18}/> Download report</Button></div><section className="chart-card"><h2>Generated, used and shared</h2><p className="chart-summary">Across six months, Bella generated {totals.generated} kWh, used {totals.used} kWh and contributed {totals.contributed} kWh.</p><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={energyHistory} margin={{top:20,right:10,left:-15,bottom:0}}><CartesianGrid vertical={false} stroke="#d9d9d9"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'#f5f5f5'}}/><Legend/><Bar dataKey="generated" name="Generated" fill="#111" radius={[6,6,0,0]}/><Bar dataKey="used" name="Used" fill="#7D69E8" radius={[6,6,0,0]}/><Bar dataKey="contributed" name="Contributed" fill="#F893F6" stroke="#111" strokeWidth={1} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></section><h2 className="impact-title">Your six-month impact</h2><div className="impact-grid">{[['Total solar generated',totals.generated+' kWh'],['Total energy used',totals.used+' kWh'],['Total spare energy',totals.spare+' kWh'],['Total contributed',totals.contributed+' kWh'],['Sarge Credits earned',totals.contributed],['Households supported','18']].map(([l,v])=><div key={l}><span>{l}</span><strong>{v}</strong></div>)}</div></Shell> }

function Onboarding() {
 const nav=useNavigate();
 const [screen,setScreen]=useState('hero');
 const [property,setProperty]=useState('Home');
 const [suburb,setSuburb]=useState('Dapto');
 const [systemSize,setSystemSize]=useState('6.6');
 const [eligibilityConsent,setEligibilityConsent]=useState(emptyConsent);
 const [method,setMethod]=useState('demo_smart_meter_data');
 const [uploadedExportFileName,setUploadedExportFileName]=useState(null);
 const [retailer,setRetailer]=useState('');
 const [inverterOrVppProvider,setInverterOrVppProvider]=useState('');
 const [weeklyCap,setWeeklyCap]=useState(defaultWeeklyDonationCap);
 const allConsent=consentItems.every(([key])=>eligibilityConsent[key]);
 const verifiedExportToday=demoDataSourcePayload.verified_export_today;
 const estimatedWeeklyExport=demoDataSourcePayload.estimated_weekly_export;
 const weeklyDonationCap=clampWeeklyCap(weeklyCap,estimatedWeeklyExport);
 const creditsToday=Math.min(verifiedExportToday,weeklyDonationCap);
 const weeklyCapRemainingAfterToday=Math.max(weeklyDonationCap-creditsToday,0);
 const updateWeeklyCap=value=>setWeeklyCap(clampWeeklyCap(value,estimatedWeeklyExport));
 const draft=()=>({property,suburb,system_size_kw:Number(systemSize)||0,donor_type:donorTypeMap[property] || 'household'});
 const dataSourcePayload=()=>({...demoDataSourcePayload,verification_method:method,uploaded_export_file_name:uploadedExportFileName,retailer:retailer || null,inverter_or_vpp_provider:inverterOrVppProvider || null,verified_export_today:method==='demo_smart_meter_data'?demoDataSourcePayload.verified_export_today:null,estimated_weekly_export:method==='demo_smart_meter_data'?demoDataSourcePayload.estimated_weekly_export:null});
 const saveDraft=()=>localStorage.setItem('sargeOnboardingDraft',JSON.stringify(draft()));
 const updateConsent=(key,checked)=>setEligibilityConsent(prev=>({...prev,[key]:checked}));
 const selectDataSourceMethod=(id)=>{setMethod(id);if(id!=='upload_csv')setUploadedExportFileName(null);if(id!=='retailer_cdr')setRetailer('');if(id!=='inverter_vpp')setInverterOrVppProvider('')};
 const continueToEligibility=()=>{saveDraft();setScreen('eligibility')};
 const continueToDataSource=()=>{const payload={...eligibilityConsent,consented_at:new Date().toISOString()};setEligibilityConsent(payload);localStorage.setItem('sargeEligibilityConsent',JSON.stringify(payload));saveDraft();setScreen('data-source')};
 const continueToPledge=()=>{if(method!=='demo_smart_meter_data')return;const payload={...dataSourcePayload(),uploaded_export_file_name:null,retailer:null,inverter_or_vpp_provider:null,verified_export_today:verifiedExportToday,estimated_weekly_export:estimatedWeeklyExport,verification_method:'demo_smart_meter_data'};saveDraft();localStorage.setItem('sargeDataSource',JSON.stringify(payload));localStorage.setItem('sargeVerificationSource',payload.verification_method);localStorage.setItem('sargeVerification',JSON.stringify({...payload,weekly_donation_cap:weeklyDonationCap,weekly_cap_remaining_after_today:weeklyCapRemainingAfterToday,status:'verified',verified:true}));setScreen('pledge')};
 const saveContribution=()=>{const source=readStoredJson('sargeDataSource',demoDataSourcePayload);const contribution={donor_id:'D001',donor_type:donorTypeMap[property] || 'household',suburb,property_type:property,system_size_kw:Number(systemSize)||0,verification_method:source.verification_method || 'demo_smart_meter_data',verified_export_today:verifiedExportToday,estimated_weekly_export:estimatedWeeklyExport,weekly_donation_cap:weeklyDonationCap,weekly_cap_remaining_after_today:weeklyCapRemainingAfterToday,remaining_weekly_cap:weeklyCapRemainingAfterToday,credits_created_today:creditsToday,pledged_kwh:weeklyDonationCap,verified_spare_kwh:verifiedExportToday,contributed_kwh:creditsToday,sarge_credits_created:calculateSargeCredits(creditsToday),eligibility_consent:readStoredJson('sargeEligibilityConsent',{...emptyConsent,consented_at:''}),status:'verified',verified:true};saveDraft();localStorage.setItem('sargeContribution',JSON.stringify(contribution));localStorage.setItem('sargeVerification',JSON.stringify({...source,verified_export_today:verifiedExportToday,estimated_weekly_export:estimatedWeeklyExport,weekly_donation_cap:weeklyDonationCap,weekly_cap_remaining_after_today:weeklyCapRemainingAfterToday,status:'verified',verified:true}));return contribution};
 const continueToConfirmDonation=()=>{saveContribution();setScreen('confirm-donation')};
 const finishOnboarding=()=>{const contribution=saveContribution();localStorage.setItem('sargeOnboardingComplete','true');localStorage.setItem('sargeJustConfirmedCredits',JSON.stringify(contribution.credits_created_today || 0));nav('/overview')};
 if(screen==='property') return <main className="property-step"><header className="property-step__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button property-step__contact" href="mailto:hello@sarge.community">Contact Us</a></header><StepDots active={1}/><section className="property-step__card"><div className="property-step__top"><button className="property-step__back" type="button" onClick={()=>setScreen('hero')}><ChevronLeft size={22}/> Back</button><button className="property-step__top-continue" type="button" onClick={continueToEligibility}>Continue <ArrowRight size={22}/></button></div><h1>Tell us about<br/>your <em>property.</em></h1><div className="property-step__types">{donorPropertyTypes.map(([label,Icon])=><button key={label} className={property===label?'selected':''} type="button" onClick={()=>setProperty(label)}><Icon size={30}/><strong>{label}</strong>{property===label&&<Check className="property-step__check" size={22}/>}</button>)}</div><div className="property-step__form"><label><span>Property name <small>optional</small></span><input placeholder="e.g. Bella’s home"/></label><label><span>Wollongong suburb</span><select value={suburb} onChange={e=>setSuburb(e.target.value)}>{wollongongSuburbs.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label><span>Solar system size</span><div className="property-step__number"><input value={systemSize} onChange={e=>setSystemSize(e.target.value)} inputMode="decimal"/><b>kW</b></div></label></div></section></main>;
 if(screen==='eligibility') return <main className="property-step eligibility-step"><header className="property-step__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button property-step__contact" href="mailto:hello@sarge.community">Contact Us</a></header><StepDots active={2}/><section className="property-step__card eligibility-step__card"><div className="property-step__top"><button className="property-step__back" type="button" onClick={()=>setScreen('property')}><ChevronLeft size={22}/> Back</button><button className="property-step__top-continue" type="button" disabled={!allConsent} onClick={continueToDataSource}>Continue <ArrowRight size={22}/></button></div><h1 className="eligibility-step__title">Confirm Solar Eligibility</h1><article className="eligibility-step__summary"><span>Property summary</span><strong>{property} in {suburb}, Wollongong LGA</strong><p>Solar system size: {systemSize} kW</p></article><div className="eligibility-step__checks">{consentItems.map(([key,label])=><label className={eligibilityConsent[key]?'checked':''} key={key}><input type="checkbox" checked={!!eligibilityConsent[key]} onChange={e=>updateConsent(key,e.target.checked)}/><span>{label}</span></label>)}</div>{!allConsent&&<p className="eligibility-step__helper">Please confirm all items to continue.</p>}</section></main>;
 if(screen==='data-source') return <main className="property-step verify-step data-source-step"><header className="property-step__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button property-step__contact" href="mailto:hello@sarge.community">Contact Us</a></header><StepDots active={3}/><section className="property-step__card verify-step__card data-source-step__card"><div className="property-step__top"><button className="property-step__back" type="button" onClick={()=>setScreen('eligibility')}><ChevronLeft size={22}/> Back</button><button className="property-step__top-continue" type="button" disabled={method!=='demo_smart_meter_data'} onClick={continueToPledge}>Continue <ArrowRight size={22}/></button></div><h1 className="data-source-step__title">Choose your export data source</h1><div className="data-source-step__methods" role="radiogroup" aria-label="Export data source">{dataSourceOptions.map(({id,title,badge,description,Icon})=><label key={id} className={`data-source-card ${method===id?'selected':''}`}><input type="radio" name="export-data-source" checked={method===id} onChange={()=>selectDataSourceMethod(id)}/><span className="data-source-card__radio" aria-hidden="true">{method===id&&<Check size={16}/>}</span><Icon className="data-source-card__icon" size={28}/><span className="data-source-card__copy"><span className="data-source-card__title">{title}{badge&&<b>{badge}</b>}</span><span className="data-source-card__description">{description}</span></span></label>)}</div>{method==='upload_csv'&&<section className="data-source-step__details"><label><span>Upload CSV file</span><input type="file" accept=".csv" onChange={e=>setUploadedExportFileName(e.target.files?.[0]?.name || null)}/></label>{uploadedExportFileName&&<strong>Selected file: {uploadedExportFileName}</strong>}</section>}{method==='retailer_cdr'&&<section className="data-source-step__details"><label><span>Electricity retailer</span><select value={retailer} onChange={e=>setRetailer(e.target.value)}><option value="">Select retailer</option>{retailerOptions.map(name=><option key={name} value={name}>{name}</option>)}</select></label></section>}{method==='inverter_vpp'&&<section className="data-source-step__details"><label><span>Inverter, battery, or VPP provider</span><select value={inverterOrVppProvider} onChange={e=>setInverterOrVppProvider(e.target.value)}><option value="">Select provider</option>{inverterOrVppProviderOptions.map(name=><option key={name} value={name}>{name}</option>)}</select></label></section>}</section></main>;
 if(screen==='pledge') return <main className="property-step pledge-step"><header className="property-step__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button property-step__contact" href="mailto:hello@sarge.community">Contact Us</a></header><StepDots active={4}/><section className="property-step__card pledge-step__card"><div className="property-step__top"><button className="property-step__back" type="button" onClick={()=>setScreen('data-source')}><ChevronLeft size={22}/> Back</button><button className="property-step__top-continue pledge-step__continue" type="button" onClick={continueToConfirmDonation}>Review donation <ArrowRight size={22}/></button></div><h1 className="data-source-step__title">Set your donation pledge</h1><div className="pledge-step__layout"><section className="pledge-step__metrics"><article className="pledge-step__credits pledge-step__conversion"><span>Verified export</span><strong>{formatKwh(verifiedExportToday)} kWh = {formatKwh(creditsToday)} SARGE Credits</strong></article><article><span>Weekly donation cap</span><strong>{formatKwh(weeklyDonationCap)} kWh</strong></article><article><span>Weekly cap remaining</span><strong>{formatKwh(weeklyCapRemainingAfterToday)} kWh</strong></article></section><section className="pledge-step__control"><label htmlFor="onboarding-weekly-cap">Weekly donation cap</label><div className="pledge-step__estimate"><span>Estimated weekly spare solar</span><strong>{formatKwh(estimatedWeeklyExport)} kWh</strong></div><input id="onboarding-weekly-cap" type="range" min="0" max={estimatedWeeklyExport} step="1" value={weeklyDonationCap} onChange={e=>updateWeeklyCap(e.target.value)}/><div className="pledge-step__number"><input aria-label="Weekly donation cap" type="number" min="0" max={estimatedWeeklyExport} value={weeklyDonationCap} onChange={e=>updateWeeklyCap(e.target.value)}/><span>kWh</span></div></section></div></section></main>;
 if(screen==='confirm-donation') return <main className="property-step confirm-donation-step"><header className="property-step__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button property-step__contact" href="mailto:hello@sarge.community">Contact Us</a></header><StepDots active={5}/><section className="property-step__card confirm-donation-step__card"><div className="property-step__top"><button className="property-step__back" type="button" onClick={()=>setScreen('pledge')}><ChevronLeft size={22}/> Back</button></div><h1 className="data-source-step__title">Confirm Donation</h1><ConfirmDonationSummary propertyLabel={`${property} in ${suburb}`} verifiedBy={formatVerificationMethod(method)} verifiedExportToday={verifiedExportToday} weeklyDonationCap={weeklyDonationCap} creditsCreated={creditsToday} onConfirm={finishOnboarding} showButton/></section></main>;
 return <main className="landing-hero"><video className="landing-hero__background" autoPlay muted loop playsInline preload="metadata" aria-hidden="true"><source src="/assets/figma/Sarge.mp4" type="video/mp4"/></video><div className="landing-hero__video-shade" aria-hidden="true"/><header className="landing-hero__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button button--contact" href="mailto:hello@sarge.community">Contact Us</a></header><img className="landing-hero__illustration" src={heroAssets.family} alt="" aria-hidden="true"/><section className="landing-hero__content"><h1><span>Share the sun,</span><span>with <em>The Gong.</em></span></h1><p><strong>Sarge</strong> lets you contribute solar energy you don’t use to support Wollongong households experiencing energy hardship — while recognising you for helping.</p><div className="landing-hero__actions"><button className="button button--hero" type="button" onClick={()=>setScreen('property')}>Get Started <ArrowRight size={26}/></button><a className="button button--mobile-contact" href="mailto:hello@sarge.community">Contact Us</a></div></section></main>;
}

function SupportIntake() {
 const [started,setStarted]=useState(false);
 const [step,setStep]=useState(0);
 const [form,setForm]=useState(defaultSupportForm);
 const [submittedPayload,setSubmittedPayload]=useState(null);
 const payload=submittedPayload || makeSupportPayload(form);
 const isSubmitted=step===supportFlowSteps.length-1;
 const progress=((step+1)/supportFlowSteps.length)*100;
 const setField=(key,value)=>setForm(prev=>({...prev,[key]:value}));
 const goBack=()=>setStep(current=>Math.max(0,current-1));
 const goNext=()=>{if(step===0&&form.livesInWollongong!==true)return;setStep(current=>Math.min(supportFlowSteps.length-2,current+1))};
 const toggleRebate=rebate=>setForm(prev=>{
  if(rebate==='None' || rebate==='Not sure') return {...prev,rebateTypes:[rebate]};
  const withoutFallbacks=prev.rebateTypes.filter(item=>item!=='None'&&item!=='Not sure');
  const next=withoutFallbacks.includes(rebate) ? withoutFallbacks.filter(item=>item!==rebate) : [...withoutFallbacks,rebate];
  return {...prev,rebateTypes:next.length?next:['Not sure']};
 });
 const submit=()=>{const nextPayload={...makeSupportPayload(form),submitted_at:new Date().toISOString()};setSubmittedPayload(nextPayload);localStorage.setItem('sargeSupportRequest',JSON.stringify(nextPayload));setStep(supportFlowSteps.length-1)};
 return <main className="support-intake"><header className="support-intake__header"><div className="support-intake__brand" aria-label="SARGE"><img src={heroAssets.mark} alt="" aria-hidden="true"/><span>SARGE</span></div><div className="support-intake__pill">One-time support form</div></header>{!started?<section className="support-intake__hero"><div className="support-intake__hero-copy"><img src={heroAssets.mark} alt="" aria-hidden="true"/><p className="support-intake__eyebrow">Shared local solar</p><h1>Get fair access to local solar support</h1><p>SARGE helps Wollongong households request support from donated local solar.</p></div><section className="support-intake__start-card" aria-label="Energy support form"><strong>No account needed.</strong><p>Answer a few questions so Council and energy partners can simulate fair allocation.</p><button className="support-intake__primary" type="button" onClick={()=>{setStarted(true);setStep(0)}}>Start form</button></section></section>:<section className="support-intake__workspace" aria-label="SARGE support intake workspace"><div className="support-intake__progress" aria-label="Flow progress"><div><span>Electricity support</span><strong>{supportFlowSteps[step]}</strong></div><b>Step {step+1} of {supportFlowSteps.length}</b><i aria-hidden="true"><em style={{width:`${progress}%`}}/></i></div><section className="support-intake__panel"><div className="support-intake__toolbar"><button className="support-intake__secondary" type="button" onClick={goBack} disabled={step===0 || isSubmitted}>Back</button><span>{step+1} / {supportFlowSteps.length}</span></div><div className="support-intake__screen" key={step}>{step===0&&<><SupportScreenIntro eyebrow="Location and household" title="Help us understand where support is needed."/><div className="support-intake__form-grid"><SupportTextField label="Contact email" type="email" value={form.contactEmail} onChange={value=>setField('contactEmail',value)}/><SupportSelectField label="Suburb" value={form.suburb} onChange={value=>setField('suburb',value)} options={wollongongSuburbs.map(name=>({value:name,label:name}))}/><SupportTextField label="Postcode" value={form.postcode} onChange={value=>setField('postcode',value)} inputMode="numeric"/><SupportNumberField label="Household size" min={1} value={form.householdSize} onChange={value=>setField('householdSize',value)}/><SupportYesNoField label="Do you live in Wollongong LGA?" value={form.livesInWollongong} onChange={value=>setField('livesInWollongong',value)}/></div><button className="support-intake__primary" type="button" onClick={goNext}>Continue</button></>}{step===1&&<><SupportScreenIntro eyebrow="Housing and solar access" title="Tell us about your access to rooftop solar."/><div className="support-intake__form-grid"><SupportSelectField label="Housing type" value={form.housingType} onChange={value=>setField('housingType',value)} options={supportHousingOptions}/><SupportYesNoField label="Do you have rooftop solar?" value={form.hasRooftopSolar} onChange={value=>setField('hasRooftopSolar',value)}/>{!form.hasRooftopSolar&&<SupportSelectField label="If no, reason" value={form.noSolarReason} onChange={value=>setField('noSolarReason',value)} options={supportNoSolarReasons}/>}</div><button className="support-intake__primary" type="button" onClick={goNext}>Continue</button></>}{step===2&&<><SupportScreenIntro eyebrow="Energy bill snapshot" title="Share a simple view of your current bill pressure."/><div className="support-intake__form-grid"><SupportNumberField label="Average electricity bill amount" prefix="$" min={0} value={form.averageBillAmount} onChange={value=>setField('averageBillAmount',value)}/><SupportSelectField label="Billing period" value={form.billingPeriod} onChange={value=>setField('billingPeriod',value)} options={[{value:'monthly',label:'Monthly'},{value:'quarterly',label:'Quarterly'}]}/><SupportYesNoField label="Are you currently struggling to pay?" value={form.strugglingToPay} onChange={value=>setField('strugglingToPay',value)}/><SupportYesNoField label="Is your bill overdue?" value={form.billOverdue} onChange={value=>setField('billOverdue',value)}/><label className="support-intake__field support-intake__file"><span>Optional: upload electricity bill</span><input type="file" onChange={event=>setField('billUploadedFileName',event.target.files?.[0]?.name || null)}/><small>{form.billUploadedFileName || 'No file selected'}</small></label></div><button className="support-intake__primary" type="button" onClick={goNext}>Continue</button></>}{step===3&&<><SupportScreenIntro eyebrow="Support and rebate status" title="Tell us what energy support you already receive."/><div className="support-intake__chips" aria-label="NSW energy support options">{supportRebateOptions.map(rebate=><button className={form.rebateTypes.includes(rebate)?'active':''} key={rebate} type="button" onClick={()=>toggleRebate(rebate)}>{rebate}</button>)}</div><SupportYesNoField label="Are you on a payment plan or hardship program?" value={form.hardshipProgram} onChange={value=>setField('hardshipProgram',value)}/><button className="support-intake__primary" type="button" onClick={goNext}>Continue</button></>}{step===4&&<><SupportScreenIntro eyebrow="Income band" title="Choose a broad income band."/><div className="support-intake__toggle-grid">{supportIncomeBands.map(band=><SupportToggleCard key={band} active={form.incomeBand===band} title={band} onClick={()=>setField('incomeBand',band)}/>)}</div><button className="support-intake__primary" type="button" onClick={goNext}>Continue</button></>}{step===5&&<><SupportScreenIntro eyebrow="Priority needs" title="Help us identify time-sensitive energy needs."/><div className="support-intake__form-grid"><SupportYesNoField label="Life support or medical equipment at home?" value={form.lifeSupportFlag} onChange={value=>setField('lifeSupportFlag',value)}/><SupportYesNoField label="Children, elderly, or disability support in household?" value={form.priorityHousehold} onChange={value=>setField('priorityHousehold',value)}/><SupportYesNoField label="Disconnection warning received?" value={form.disconnectionWarning} onChange={value=>setField('disconnectionWarning',value)}/></div><button className="support-intake__primary" type="button" onClick={goNext}>Continue</button></>}{step===6&&<><SupportScreenIntro eyebrow="Consent" title="Confirm how this pilot simulation may use your intake data."/><div className="support-intake__check-grid"><label><input type="checkbox" checked={form.consentInfo} onChange={event=>setField('consentInfo',event.target.checked)}/><span>I consent for SARGE to use this information to calculate fair energy support.</span></label><label><input type="checkbox" checked={form.consentPilot} onChange={event=>setField('consentPilot',event.target.checked)}/><span>I understand this is a pilot simulation, not a guaranteed rebate or bill credit.</span></label></div><button className="support-intake__primary" type="button" disabled={!(form.consentInfo&&form.consentPilot)} onClick={submit}>Submit intake</button></>}{isSubmitted&&<><div className="support-intake__success-mark"><Check size={36}/></div><SupportScreenIntro eyebrow="Submitted" title="Your support request has been submitted." body="SARGE helps Council and energy partners allocate donated local solar support fairly."/><div className="support-intake__notice"><strong>This does not guarantee government rebate approval.</strong><span>You’ll be notified if support is allocated.</span></div><div className="support-intake__summary"><article><span>Recipient</span><strong>{payload.recipient_id}</strong></article><article><span>Household</span><strong>{payload.household_size} people</strong><small>{supportHousingLabel(payload.housing_type)} in {payload.suburb}</small></article><article><span>Solar access</span><strong>{payload.solar_access_gap?'Gap identified':'Rooftop solar access'}</strong></article><article><span>Demand cap</span><strong>{payload.demandCapKwh} kWh</strong></article></div><details className="support-intake__payload" open><summary>Demo recipient payload</summary><pre>{JSON.stringify(payload,null,2)}</pre></details></>}</div></section></section>}</main>;
}

function SupportScreenIntro({title,body}) {
 return <div className="support-intake__screen-intro"><h2>{title}</h2>{body&&<p>{body}</p>}</div>;
}

function SupportTextField({label,type='text',value,onChange,inputMode}) {
 return <label className="support-intake__field"><span>{label}</span><input type={type} value={value} inputMode={inputMode} onChange={event=>onChange(event.target.value)}/></label>;
}

function SupportNumberField({label,value,onChange,min,prefix}) {
 return <label className="support-intake__field"><span>{label}</span><div className="support-intake__number">{prefix&&<b>{prefix}</b>}<input type="number" min={min} value={value} onChange={event=>onChange(Number(event.target.value))}/></div></label>;
}

function SupportSelectField({label,value,onChange,options}) {
 return <label className="support-intake__field"><span>{label}</span><select value={value} onChange={event=>onChange(event.target.value)}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function SupportYesNoField({label,value,onChange}) {
 const isLgaGate=label==='Do you live in Wollongong LGA?';
 const gateState=value===true?'is-yes':value===false?'is-no':'is-unselected';
 return <fieldset className={`support-intake__field support-intake__yes-no ${isLgaGate?`support-intake__lga-gate ${gateState}`:''}`}><legend>{label}</legend><div><button className={value===true?'active':''} type="button" onClick={()=>onChange(true)}>Yes</button><button className={value===false?'active':''} type="button" onClick={()=>onChange(false)}>No</button></div>{isLgaGate&&value===false&&<p className="support-intake__eligibility-note">SARGE support is currently piloted for Wollongong LGA households.</p>}</fieldset>;
}

function SupportToggleCard({active,title,onClick}) {
 return <button className={`support-intake__toggle ${active?'active':''}`} type="button" onClick={onClick}><span aria-hidden="true"/><strong>{title}</strong></button>;
}

function Review() {
 const nav=useNavigate();
 const contribution=readStoredJson('sargeContribution',null);
 const draft=readStoredJson('sargeOnboardingDraft',{property:'Home',suburb:'Dapto',system_size_kw:6.6,donor_type:'household'});
 const payload=contribution || {donor_id:'D001',donor_type:draft.donor_type,suburb:draft.suburb,verified_export_today:demoVerification.verified_export_today,credits_created_today:demoVerification.verified_export_today,eligibility_consent:readStoredJson('sargeEligibilityConsent',{...emptyConsent,consented_at:''})};
 const start=()=>{localStorage.setItem('sargeOnboardingComplete','true');nav('/overview')};
 return <Shell title="Review your donor setup" eyebrow="Review"><section className="review-card"><div className="calculation"><span>Property</span><strong>{draft.property} in {draft.suburb}</strong><span>Verified export today</span><strong>{payload.verified_export_today} kWh</strong><span>SARGE Credits today</span><strong>{payload.credits_created_today}</strong><span>Reward</span><strong>{payload.reward_preference || 'Selected later'}</strong><span>Status</span><strong>{payload.status || 'ready'}</strong></div><Button onClick={start}>Start donating <ArrowRight size={18}/></Button></section></Shell>;
}

function RootRedirect(){const done=typeof window!=='undefined'&&localStorage.getItem('sargeOnboardingComplete')==='true'; return <Navigate to={done?'/overview':'/onboarding'} replace/>}
function useIsClient(){return useSyncExternalStore(()=>()=>{},()=>true,()=>false)}
export default function App(){const isClient=useIsClient();if(!isClient)return <main className="app-boot" aria-label="Loading Sarge"/>;return <BrowserRouter><Routes><Route path="/" element={<RootRedirect/>}/><Route path="/support" element={<SupportIntake/>}/><Route path="/onboarding" element={<Onboarding/>}/><Route path="/overview" element={<Overview/>}/><Route path="/contribute" element={<Contribute/>}/><Route path="/confirm-donation" element={<ConfirmDonation/>}/><Route path="/rewards" element={<Rewards/>}/><Route path="/review" element={<Review/>}/><Route path="/reports" element={<Reports/>}/><Route path="/council" element={<CouncilDashboard/>}/><Route path="/council/*" element={<CouncilDashboard/>}/><Route path="/algorithm/demo" element={<PriorityDemo/>}/><Route path="/algorithm/docs" element={<Methodology/>}/><Route path="/algorithm/docs/provenance" element={<Navigate to="/algorithm/docs" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
