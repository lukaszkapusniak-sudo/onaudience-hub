/* ═══ state.js — shared mutable state ═══ */

import { SEED_RAW } from './config.js';
import { classify, _slug } from './utils.js';

const SEED = SEED_RAW.map(([name,note])=>({name,note:note||'',type:classify(note),id:_slug(name),category:null,region:null,size:null,website:null,linkedin_slug:null,icp:null,description:null,hq_city:null,founded_year:null,funding:null,tcf_vendor_id:null,tech_stack:null,products:null,dsps:null,outreach_angle:null,updated_at:null}));

/* all state lives here — modules import and mutate S directly */
const S = {
  companies: [...SEED],
  contacts: [],
  activeFilter: 'all',
  searchQ: '',
  activeTab: 'companies',
  activeTags: new Set(),
  tagLogic: 'or',
  tagPanelOpen: false,
  aiSet: null,
  currentCompany: null,
  currentContact: null,
  _modalMode: 'research',
  /* sort */
  sortBy: 'recent', // recent | name | icp
  /* console */
  consoleLog: [], // {ts, type:'ai'|'db'|'enrich'|'info', msg}
  /* meeseeks */
  mcActivePId: 'steve',
  mcPayload: {},
  mcDbContacts: [],
  mcAiContacts: [],
  mcSelectedIdx: -1,
  mcLastEmail: '',
  /* tcf */
  tcfSelected: new Set(),
};

export default S;
