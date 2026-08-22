'use client';
/* eslint-disable @next/next/no-img-element */

import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Check, ChevronLeft, Download, FileText, Home, Menu, Users, X, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState, useSyncExternalStore } from 'react';
import { defaultWeeklyDonationCap, demoVerification, energyHistory, user, calculateSargeCredits } from '../src/data/mockEnergyData';
import CouncilDashboard from '../../council-frontend/app/CouncilDashboard';

const Button = ({ children, variant = 'dark', className = '', ...props }) => <button className={`button button--${variant} ${className}`} {...props}>{children}</button>;
const StepDots = ({ active, total = 5 }) => <div className="step-dots" aria-label={`Step ${active} of ${total}`}>{Array.from({length:total},(_,i)=><span key={i} className={i<active?'active':''}/>)}</div>;
const heroAssets = {
  background: '/assets/figma/welcoming-bg.jpg',
  mark: '/assets/figma/sarge-lightning-mark.png?v=clean-icon',
  divider: '/assets/figma/logo-divider-figma.svg',
  family: '/assets/figma/sarge-family-figma.png',
};
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
const supportScreens = ['intro','location','housing','bill','status','priority','consent','summary'];
const housingOptions = [
 {value:'renter',label:'Renter',Icon:Home},
 {value:'owner',label:'Owner',Icon:Home},
 {value:'apartment',label:'Apartment',Icon:Building2},
 {value:'social_housing',label:'Social housing',Icon:Building2},
 {value:'other',label:'Other',Icon:Users},
];
const noSolarReasonOptions = [
 {value:'renting',label:'Renting'},
 {value:'apartment',label:'Apartment'},
 {value:'no_roof_access',label:'No roof access'},
 {value:'too_expensive',label:'Too expensive'},
 {value:'unsure',label:'Not sure'},
];
const rebateOptions = ['Low Income Household Rebate','Family Energy Rebate','Seniors Energy Rebate','Medical Energy Rebate','Life Support Rebate','EAPA','None','Not sure'];
const incomeBands = ['Under $500/week','$500-$999/week','$1000-$1499/week','$1500+/week','Prefer not to say'];
const highNeedSuburbs = new Set(['Warrawong','Cringila','Berkeley','Port Kembla','Lake Heights','Bellambi']);
const civicRewardRates = [
 {credits:'20 credits',reward:'1 hour parking'},
 {credits:'100 credits',reward:'$5 leisure voucher'},
 {credits:'300 credits',reward:'green waste voucher'},
];
const emptyConsent = {
 located_in_wollongong_lga:false,
 has_export_source:false,
 has_verifiable_export_data:false,
 export_data_consent:false,
};
const readStoredJson = (key, fallback) => { if (typeof window === 'undefined') return fallback; try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const clampWeeklyCap = (value, max) => Math.min(Math.max(0, Number(value) || 0), max);
const formatKwh = value => Number(value).toLocaleString(undefined,{maximumFractionDigits:1});
const formatVerificationMethod = method => method === 'demo_smart_meter_data' ? 'Demo smart meter data' : String(method || 'demo_smart_meter_data').replace(/_/g,' ');
const getOptionLabel = (options,value) => options.find(option => option.value === value)?.label || value;
const incomeGapScore = incomeBand => ({'Under $500/week':1,'$500-$999/week':0.72,'$1000-$1499/week':0.42,'$1500+/week':0.16,'Prefer not to say':0.5}[incomeBand] ?? 0.5);
const makeSupportPayload = form => {
 const receivesEnergyRebate = form.rebateTypes.some(rebate => rebate !== 'None' && rebate !== 'Not sure');
 const solarAccessGap = !form.hasRooftopSolar || ['renter','apartment','social_housing'].includes(form.housingType);
 const monthlyBill = form.billingPeriod === 'quarterly' ? Number(form.averageBillAmount) / 3 : Number(form.averageBillAmount);
 const areaDisadvantage = highNeedSuburbs.has(form.suburb) ? 1 : 0.38;
 const paymentDifficulty = Math.min(1,(form.strugglingToPay ? 0.42 : 0) + (form.billOverdue ? 0.34 : 0) + (form.hardshipProgram ? 0.18 : 0) + (form.disconnectionWarning ? 0.25 : 0));
 const energyBurden = Math.min(1,monthlyBill / 260);
 return {
  recipient_id:'R-DEMO-001',
  suburb:form.suburb,
  postcode:form.postcode,
  household_size:Number(form.householdSize) || 1,
  lives_in_wollongong_lga:form.livesInWollongong,
  housing_type:form.housingType,
  has_rooftop_solar:form.hasRooftopSolar,
  no_solar_reason:form.hasRooftopSolar ? null : form.noSolarReason,
  solar_access_gap:solarAccessGap,
  average_bill_amount:Number(form.averageBillAmount) || 0,
  billing_period:form.billingPeriod,
  bill_overdue:form.billOverdue,
  bill_uploaded_file_name:form.billUploadedFileName,
  struggling_to_pay:form.strugglingToPay,
  receives_energy_rebate:receivesEnergyRebate,
  rebate_types:form.rebateTypes,
  hardship_program:form.hardshipProgram,
  income_band:form.incomeBand,
  life_support_flag:form.lifeSupportFlag ? 1 : 0,
  priority_household:form.priorityHousehold,
  disconnection_warning:form.disconnectionWarning,
  consent:form.consentInfo && form.consentPilot,
  algorithm_inputs:{
   income_gap:incomeGapScore(form.incomeBand),
   area_disadvantage:areaDisadvantage,
   payment_difficulty:paymentDifficulty,
   energy_burden:energyBurden,
   no_solar_access:solarAccessGap ? 1 : 0,
   life_support_flag:form.lifeSupportFlag ? 1 : 0,
   is_high_need_area:highNeedSuburbs.has(form.suburb) ? 1 : 0,
   demand_cap_kwh:8,
  },
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
  const contribution=readStoredJson('sargeContribution',null);
  const creditsJustAdded=Number(contribution?.credits_created_today ?? demoVerification.verified_export_today);
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
 const confirm=()=>{localStorage.setItem('sargeOnboardingComplete','true');nav('/overview')};
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
 const [screen,setScreen]=useState('intro');
 const [submitted,setSubmitted]=useState(false);
 const [form,setForm]=useState({
  name:'Alex Demo',
  suburb:'Warrawong',
  postcode:'2502',
  householdSize:3,
  livesInWollongong:true,
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
  consentInfo:true,
  consentPilot:true,
 });
 const currentIndex=supportScreens.indexOf(screen);
 const payload=makeSupportPayload(form);
 const setField=(key,value)=>setForm(prev=>({...prev,[key]:value}));
 const goBack=()=>setScreen(supportScreens[Math.max(currentIndex-1,0)]);
 const goNext=()=>setScreen(supportScreens[Math.min(currentIndex+1,supportScreens.length-1)]);
 const toggleRebate=rebate=>setForm(prev=>{
  if(rebate==='None' || rebate==='Not sure') return {...prev,rebateTypes:[rebate]};
  const withoutFallbacks=prev.rebateTypes.filter(item=>item!=='None'&&item!=='Not sure');
  const next=withoutFallbacks.includes(rebate) ? withoutFallbacks.filter(item=>item!==rebate) : [...withoutFallbacks,rebate];
  return {...prev,rebateTypes:next.length?next:['Not sure']};
 });
 const submit=()=>{localStorage.setItem('sargeSupportIntake',JSON.stringify({...payload,submitted_at:new Date().toISOString()}));setSubmitted(true)};
 const canContinue=screen!=='consent' || (form.consentInfo && form.consentPilot);
 const continueLabel=screen==='summary'?'Submit intake':'Continue';
 const continueAction=screen==='summary'?submit:goNext;

 if(submitted) return <main className="property-step support-step support-step--submitted"><header className="property-step__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button property-step__contact" href="mailto:hello@sarge.community">Contact Us</a></header><section className="property-step__card support-step__submitted-card"><div className="success-mark"><Check/></div><h1>Support intake<br/><em>submitted.</em></h1><p className="support-step__lead">Your demo support profile has been saved locally for the prototype. It can be used later to simulate priority allocation against the shared energy pool.</p><button className="property-step__top-continue" type="button" onClick={()=>{setSubmitted(false);setScreen('intro')}}>Start another <ArrowRight size={22}/></button></section></main>;

 if(screen==='intro') return <main className="landing-hero support-landing"><img className="landing-hero__background" src={heroAssets.background} alt="" aria-hidden="true"/><header className="landing-hero__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button button--contact" href="mailto:hello@sarge.community">Contact Us</a></header><img className="landing-hero__illustration" src={heroAssets.family} alt="" aria-hidden="true"/><section className="landing-hero__content"><p className="support-landing__pill">One-time support form</p><h1><span>Get fair access</span><span>to local <em>solar support.</em></span></h1><p><strong>SARGE</strong> helps Wollongong households request energy support from shared local solar. No donor account or solar setup required.</p><div className="landing-hero__actions"><button className="button button--hero" type="button" onClick={()=>setScreen('location')}>Start support form <ArrowRight size={26}/></button><a className="button button--mobile-contact" href="mailto:hello@sarge.community">Contact Us</a></div></section></main>;

 return <main className={`property-step support-step support-step--${screen}`}><header className="property-step__nav"><div className="brand-lockup" aria-label="Sarge, Wollongong Renewable Energy Ecosystem"><img src={heroAssets.mark} alt="" className="brand-lockup__mark"/><strong className="brand-lockup__name">Sarge</strong><img src={heroAssets.divider} alt="" className="brand-lockup__divider"/><span className="brand-lockup__tag">Wollongong Renewable<br/>Energy Ecosystem</span></div><a className="button property-step__contact" href="mailto:hello@sarge.community">Contact Us</a></header><StepDots active={currentIndex} total={supportScreens.length-1}/><section className="property-step__card support-step__card"><div className="property-step__top"><button className="property-step__back" type="button" onClick={goBack}><ChevronLeft size={22}/> Back</button><button className="property-step__top-continue" type="button" disabled={!canContinue} onClick={continueAction}>{continueLabel} <ArrowRight size={22}/></button></div>{screen==='location'&&<><h1>Where is support<br/>needed?</h1><div className="property-step__form support-step__form"><label><span>Preferred name</span><input value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="e.g. Alex"/></label><label><span>Wollongong suburb</span><select value={form.suburb} onChange={e=>setField('suburb',e.target.value)}>{wollongongSuburbs.map(name=><option key={name} value={name}>{name}</option>)}</select></label><label><span>Postcode</span><input value={form.postcode} onChange={e=>setField('postcode',e.target.value)} inputMode="numeric"/></label><label><span>Household size</span><div className="property-step__number"><input value={form.householdSize} onChange={e=>setField('householdSize',Number(e.target.value))} type="number" min="1"/><b>people</b></div></label></div><div className="support-step__toggle-row"><span>Do you live in Wollongong LGA?</span><button type="button" className={form.livesInWollongong?'selected':''} onClick={()=>setField('livesInWollongong',true)}>Yes</button><button type="button" className={!form.livesInWollongong?'selected':''} onClick={()=>setField('livesInWollongong',false)}>No</button></div></>}{screen==='housing'&&<><h1>Tell us about<br/>your <em>home.</em></h1><div className="property-step__types support-step__types">{housingOptions.map(({value,label,Icon})=><button key={value} className={form.housingType===value?'selected':''} type="button" onClick={()=>setField('housingType',value)}><Icon size={30}/><strong>{label}</strong>{form.housingType===value&&<Check className="property-step__check" size={22}/>}</button>)}</div><div className="support-step__toggle-row"><span>Do you have rooftop solar?</span><button type="button" className={form.hasRooftopSolar?'selected':''} onClick={()=>setField('hasRooftopSolar',true)}>Yes</button><button type="button" className={!form.hasRooftopSolar?'selected':''} onClick={()=>setField('hasRooftopSolar',false)}>No</button></div>{!form.hasRooftopSolar&&<div className="property-step__form support-step__form support-step__single"><label><span>Why not?</span><select value={form.noSolarReason} onChange={e=>setField('noSolarReason',e.target.value)}>{noSolarReasonOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>}</>}{screen==='bill'&&<><h1>Energy bill<br/><em>snapshot.</em></h1><div className="property-step__form support-step__form"><label><span>Average electricity bill</span><div className="property-step__number"><b>$</b><input value={form.averageBillAmount} onChange={e=>setField('averageBillAmount',Number(e.target.value))} type="number" min="0"/></div></label><label><span>Billing period</span><select value={form.billingPeriod} onChange={e=>setField('billingPeriod',e.target.value)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label><label><span>Optional bill upload</span><input type="file" onChange={e=>setField('billUploadedFileName',e.target.files?.[0]?.name || null)}/></label></div><div className="support-step__dual-toggles"><div className="support-step__toggle-row"><span>Currently struggling to pay?</span><button type="button" className={form.strugglingToPay?'selected':''} onClick={()=>setField('strugglingToPay',true)}>Yes</button><button type="button" className={!form.strugglingToPay?'selected':''} onClick={()=>setField('strugglingToPay',false)}>No</button></div><div className="support-step__toggle-row"><span>Is your bill overdue?</span><button type="button" className={form.billOverdue?'selected':''} onClick={()=>setField('billOverdue',true)}>Yes</button><button type="button" className={!form.billOverdue?'selected':''} onClick={()=>setField('billOverdue',false)}>No</button></div></div>{form.billUploadedFileName&&<p className="support-step__note">Selected file: {form.billUploadedFileName}</p>}</>}{screen==='status'&&<><h1>Support already<br/>received.</h1><div className="support-step__chips" aria-label="Energy support and rebate options">{rebateOptions.map(rebate=><button type="button" key={rebate} className={form.rebateTypes.includes(rebate)?'selected':''} onClick={()=>toggleRebate(rebate)}>{rebate}</button>)}</div><div className="support-step__toggle-row"><span>Are you on a payment plan or hardship program?</span><button type="button" className={form.hardshipProgram?'selected':''} onClick={()=>setField('hardshipProgram',true)}>Yes</button><button type="button" className={!form.hardshipProgram?'selected':''} onClick={()=>setField('hardshipProgram',false)}>No</button></div><div className="property-step__form support-step__form support-step__single"><label><span>Income band</span><select value={form.incomeBand} onChange={e=>setField('incomeBand',e.target.value)}>{incomeBands.map(band=><option key={band} value={band}>{band}</option>)}</select></label></div></>}{screen==='priority'&&<><h1>Priority<br/><em>needs.</em></h1><div className="support-step__priority-grid"><label className={form.lifeSupportFlag?'checked':''}><input type="checkbox" checked={form.lifeSupportFlag} onChange={e=>setField('lifeSupportFlag',e.target.checked)}/><span>Life support or medical equipment at home</span></label><label className={form.priorityHousehold?'checked':''}><input type="checkbox" checked={form.priorityHousehold} onChange={e=>setField('priorityHousehold',e.target.checked)}/><span>Children, elderly, disability, or caring needs in household</span></label><label className={form.disconnectionWarning?'checked':''}><input type="checkbox" checked={form.disconnectionWarning} onChange={e=>setField('disconnectionWarning',e.target.checked)}/><span>Disconnection warning received</span></label></div></>}{screen==='consent'&&<><h1>Consent for<br/>the <em>pilot.</em></h1><div className="eligibility-step__checks support-step__priority-grid"><label className={form.consentInfo?'checked':''}><input type="checkbox" checked={form.consentInfo} onChange={e=>setField('consentInfo',e.target.checked)}/><span>I consent for SARGE to use this information to calculate fair energy support.</span></label><label className={form.consentPilot?'checked':''}><input type="checkbox" checked={form.consentPilot} onChange={e=>setField('consentPilot',e.target.checked)}/><span>I understand this is a pilot simulation, not a guaranteed rebate or bill credit.</span></label></div>{!canContinue&&<p className="eligibility-step__helper">Please confirm both items to continue.</p>}</>}{screen==='summary'&&<><h1>Your support<br/>profile is ready.</h1><div className="support-step__summary"><article><span>Household</span><strong>{form.householdSize} people</strong><small>{getOptionLabel(housingOptions,form.housingType)} in {form.suburb}</small></article><article><span>Solar access</span><strong>{payload.solar_access_gap?'No rooftop solar access':'Rooftop solar access'}</strong><small>{form.hasRooftopSolar?'Has rooftop solar':getOptionLabel(noSolarReasonOptions,form.noSolarReason)}</small></article><article><span>Bill pressure</span><strong>${form.averageBillAmount} / {form.billingPeriod}</strong><small>{form.billOverdue?'Bill overdue':'Bill not overdue'}</small></article><article><span>Priority signals</span><strong>{payload.algorithm_inputs.life_support_flag || payload.algorithm_inputs.is_high_need_area || form.disconnectionWarning ? 'Priority review' : 'Standard review'}</strong><small>{form.rebateTypes.join(', ')}</small></article></div><details className="support-step__payload"><summary>Demo recipient payload</summary><pre>{JSON.stringify(payload,null,2)}</pre></details></>}</section></main>;
}

function Review() {
 const nav=useNavigate();
 const contribution=readStoredJson('sargeContribution',null);
 const draft=readStoredJson('sargeOnboardingDraft',{property:'Home',suburb:'Dapto',system_size_kw:6.6,donor_type:'household'});
 const payload=contribution || {donor_id:'D001',donor_type:draft.donor_type,suburb:draft.suburb,verified_export_today:demoVerification.verified_export_today,credits_created_today:demoVerification.verified_export_today,eligibility_consent:readStoredJson('sargeEligibilityConsent',{...emptyConsent,consented_at:''})};
 const start=()=>{localStorage.setItem('sargeOnboardingComplete','true');nav('/overview')};
 return <Shell title="Review your donor setup" eyebrow="Review"><section className="review-card"><div className="calculation"><span>Property</span><strong>{draft.property} in {draft.suburb}</strong><span>Verified export today</span><strong>{payload.verified_export_today} kWh</strong><span>SARGE Credits today</span><strong>{payload.credits_created_today}</strong><span>Reward</span><strong>{payload.reward_preference || 'Selected later'}</strong><span>Status</span><strong>{payload.status || 'ready'}</strong></div><Button onClick={start}>Start donating <ArrowRight size={18}/></Button></section></Shell>;
}

function RootRedirect(){return <Navigate to="/support" replace/>}
function useIsClient(){return useSyncExternalStore(()=>()=>{},()=>true,()=>false)}
export default function App(){const isClient=useIsClient();if(!isClient)return <main className="app-boot" aria-label="Loading Sarge"/>;return <BrowserRouter><Routes><Route path="/" element={<RootRedirect/>}/><Route path="/support" element={<Onboarding/>}/><Route path="/onboarding" element={<Navigate to="/support" replace/>}/><Route path="/overview" element={<Overview/>}/><Route path="/contribute" element={<Contribute/>}/><Route path="/confirm-donation" element={<ConfirmDonation/>}/><Route path="/rewards" element={<Rewards/>}/><Route path="/review" element={<Review/>}/><Route path="/reports" element={<Reports/>}/><Route path="/council" element={<CouncilDashboard/>}/><Route path="/council/*" element={<CouncilDashboard/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
