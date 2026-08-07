"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { Check, Download, Edit, ExternalLink, LayoutGrid, MessageCircle, Moon, Palette, Save, Sun, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ADMIN_UI_LAYOUTS, ADMIN_UI_THEMES, normalizeAdminUiLayout, normalizeAdminUiTheme, normalizeStorefrontLayout, normalizeStorefrontTheme, STOREFRONT_LAYOUTS, STOREFRONT_THEMES } from "@/lib/theme-config";

const AUTH_CONTROLS = [
  ["customer_registration_enabled", "Customer registration", "Allow new customer accounts."],
  ["customer_login_enabled", "Customer login", "Allow customers to sign in. Admin authentication is never affected."],
  ["guest_checkout_enabled", "Guest checkout", "Allow orders without a customer account."],
  ["login_required_for_checkout", "Require login for checkout", "When enabled, guest checkout is blocked server-side."],
  ["guest_email_required", "Require guest email", "Make email mandatory only for guest orders."],
  ["customer_email_verification_enabled", "Customer email verification", "Require verified customer identities when the email provider is configured."],
  ["google_customer_login_enabled", "Google customer login", "Enable the Google customer OAuth route."],
  ["forgot_password_enabled", "Forgot password", "Allow password reset requests."],
  ["customer_account_pages_enabled", "Customer account pages", "Control customer account portal availability."]
] as const;

const AUTH_DEFAULTS: Record<string,string> = Object.fromEntries(AUTH_CONTROLS.map(([key]) => [key, ["login_required_for_checkout","guest_email_required","customer_email_verification_enabled"].includes(key) ? "false" : "true"]));
const APPEARANCE_DEFAULTS = { storefront_theme: "industrial", storefront_layout: "showroom", admin_ui_theme: "operations", admin_ui_layout: "operations", default_theme: "light" };

type IntegrationState = {
  key: string;
  label: string;
  provider: string;
  state: "Connected" | "Not configured" | "Failed";
  missing: string[];
  lastError?: string | null;
  lastActivityAt?: string | null;
};

export function ReviewManager() {
  const [items,setItems]=useState<any[]>([]); const [rating,setRating]=useState(""); const [selected,setSelected]=useState<any|null>(null); const [toast,setToast]=useState("");
  const load=useCallback(async()=>{const d=await fetch(`/api/admin/reviews?rating=${rating}`).then(r=>r.json()); setItems(Array.isArray(d)?d:[]);},[rating]);
  useEffect(()=>{void load();},[load]);
  async function save(){const r=await fetch(`/api/admin/reviews/${selected.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(selected)}); setToast(r.ok?"Review saved":"Save failed"); setSelected(null); await load();}
  async function remove(id:string){if(!confirm("Delete review?"))return; const r=await fetch(`/api/admin/reviews/${id}`,{method:"DELETE"}); setToast(r.ok?"Deleted":"Delete failed"); await load();}
  return <div className="space-y-4"><select className="rounded-lg border p-2 dark:bg-slate-950" value={rating} onChange={e=>setRating(e.target.value)}><option value="">All ratings</option>{[5,4,3,2,1].map(r=><option key={r}>{r}</option>)}</select><div className="grid gap-3">{items.length?items.map(x=><div key={x.id} className="rounded-xl border bg-white p-4 dark:bg-slate-900"><strong>{x.title}</strong><p className="text-sm">{x.product?.name} - {x.rating}/5 - {x.isApproved?"Approved":x.isRejected?"Rejected":"Pending"} - {x.isVerifiedPurchase?"Verified":""}</p><p className="text-sm text-slate-500">{x.comment}</p><div className="mt-3 flex gap-2"><button className="rounded-md border p-2" onClick={()=>setSelected(x)}><Edit size={17}/></button><button className="rounded-md border p-2 text-red-600" onClick={()=>void remove(x.id)}><Trash2 size={17}/></button></div></div>):<div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No reviews.</div>}</div>{selected?<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><div className="w-full max-w-xl rounded-xl bg-white p-5 dark:bg-slate-950"><h2 className="text-2xl font-black">{selected.title}</h2><textarea className="mt-4 w-full rounded-lg border p-2 dark:bg-slate-900" value={selected.reply||""} placeholder="Admin reply" onChange={e=>setSelected({...selected,reply:e.target.value})}/><div className="mt-3 grid gap-2 sm:grid-cols-2">{["isApproved","isRejected","isVerifiedPurchase","isAbusive"].map(k=><label key={k} className="flex gap-2 rounded-lg border p-2"><input type="checkbox" checked={!!selected[k]} onChange={e=>setSelected({...selected,[k]:e.target.checked})}/>{k}</label>)}</div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>Cancel</Button><Button variant="accent" onClick={()=>void save()}>Save</Button></div></div></div>:null}{toast?<div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div>:null}</div>;
}

export function SupportManager() {
  const [items,setItems]=useState<any[]>([]); const [form,setForm]=useState<any|null>(null); const [status,setStatus]=useState(""); const [toast,setToast]=useState("");
  const load=useCallback(async()=>{const d=await fetch(`/api/admin/support-tickets?status=${status}`).then(r=>r.json()); setItems(Array.isArray(d)?d:[]);},[status]);
  useEffect(()=>{void load();},[load]);
  async function save(){const url=form.id?`/api/admin/support-tickets/${form.id}`:"/api/admin/support-tickets"; const r=await fetch(url,{method:form.id?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}); setToast(r.ok?"Saved":"Save failed"); setForm(null); await load();}
  return <div className="space-y-4"><div className="flex gap-2"><select className="rounded-lg border p-2 dark:bg-slate-950" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All</option>{["OPEN","APPROVED","REJECTED","REFUNDED","CLOSED"].map(s=><option key={s}>{s}</option>)}</select><Button variant="accent" onClick={()=>setForm({type:"COMPLAINT",status:"OPEN",title:"",description:""})}>New ticket</Button></div><div className="grid gap-3">{items.length?items.map(x=><div key={x.id} className="rounded-xl border bg-white p-4 dark:bg-slate-900"><strong>{x.title}</strong><p className="text-sm text-slate-500">{x.type} - {x.status} - {x.user?.name||"Guest"}</p><p>{x.description}</p><div className="mt-3 flex gap-2"><button className="rounded-md border p-2" onClick={()=>setForm(x)}><Edit size={17}/></button><a className="rounded-md border p-2" target="_blank" href={`https://wa.me/${String(x.user?.phone||"").replace(/\D/g,"")}`}><MessageCircle size={17}/></a></div></div>):<div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No support tickets.</div>}</div>{form?<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><div className="w-full max-w-2xl rounded-xl bg-white p-5 dark:bg-slate-950"><h2 className="text-2xl font-black">Support / Return Request</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Type" value={form.type||""} onChange={e=>setForm({...form,type:e.target.value})}/><select className="rounded-lg border p-2 dark:bg-slate-900" value={form.status||"OPEN"} onChange={e=>setForm({...form,status:e.target.value})}>{["OPEN","APPROVED","REJECTED","REFUNDED","CLOSED"].map(s=><option key={s}>{s}</option>)}</select><input className="rounded-lg border p-2 sm:col-span-2 dark:bg-slate-900" placeholder="Title" value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})}/><textarea className="rounded-lg border p-2 sm:col-span-2 dark:bg-slate-900" placeholder="Description" value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/><textarea className="rounded-lg border p-2 sm:col-span-2 dark:bg-slate-900" placeholder="Notes" value={form.internalNotes||""} onChange={e=>setForm({...form,internalNotes:e.target.value})}/><input className="rounded-lg border p-2 sm:col-span-2 dark:bg-slate-900" placeholder="Evidence URL" value={form.evidenceUrl||""} onChange={e=>setForm({...form,evidenceUrl:e.target.value})}/></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={()=>setForm(null)}>Cancel</Button><Button variant="accent" onClick={()=>void save()}>Save</Button></div></div></div>:null}{toast?<div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div>:null}</div>;
}

export function SettingsManager() {
  const keys=["company_name","logo","favicon","address","phone","whatsapp_number","email","business_hours","google_maps_link","footer_description","facebook_url","instagram_url","youtube_url","linkedin_url","currency","tax_settings","invoice_prefix","order_prefix","low_stock_threshold","free_delivery_amount","default_delivery_charges","return_policy","privacy_policy","terms_conditions","delivery_policy","warranty_policy","about_us","faq","announcement_bar","social_links","payment_methods","bank_transfer_details","easypaisa_qr","jazzcash_qr","notification_settings","theme_primary_color","theme_surface_color","theme_background_color","animations_enabled","maintenance_enabled","maintenance_message"];
  const router=useRouter();
  const [data,setData]=useState<Record<string,string>>({...AUTH_DEFAULTS,...APPEARANCE_DEFAULTS});
  const [integrations,setIntegrations]=useState<IntegrationState[]>([]);
  const [pendingJobs,setPendingJobs]=useState(0);
  const [toast,setToast]=useState("");
  const [saving,setSaving]=useState(false);

  const loadIntegrations=useCallback(async()=>{
    const response=await fetch("/api/admin/integrations/status",{cache:"no-store"});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(payload.error||"Integration status unavailable");
    setIntegrations(Array.isArray(payload.items)?payload.items:[]);
    setPendingJobs(Number(payload.pending||0));
  },[]);

  useEffect(()=>{
    fetch("/api/admin/settings").then(r=>r.json()).then(value=>setData({...AUTH_DEFAULTS,...APPEARANCE_DEFAULTS,...value})).catch(()=>setData({...AUTH_DEFAULTS,...APPEARANCE_DEFAULTS}));
    void loadIntegrations().catch((error)=>setToast(error instanceof Error?error.message:"Integration status unavailable"));
  },[loadIntegrations]);

  async function save(){
    setSaving(true);
    try{
      const response=await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const payload=await response.json().catch(()=>({}));
      setToast(response.ok?"Settings saved":payload.error||"Save failed");
      if(response.ok){
        const storefrontTheme=normalizeStorefrontTheme(data.storefront_theme);
        const storefrontLayout=normalizeStorefrontLayout(data.storefront_layout);
        const adminTheme=normalizeAdminUiTheme(data.admin_ui_theme);
        const adminLayout=normalizeAdminUiLayout(data.admin_ui_layout);
        window.localStorage.setItem("hammer-store-design",storefrontTheme);
        window.localStorage.setItem("hammer-store-layout",storefrontLayout);
        window.dispatchEvent(new CustomEvent("hammer:admin-design",{detail:{design:adminTheme,layout:adminLayout}}));
        router.refresh();
      }
    }finally{
      setSaving(false);
    }
  }

  async function retryNotifications(){
    const response=await fetch("/api/admin/integrations/status",{method:"POST"});
    const payload=await response.json().catch(()=>({}));
    setToast(response.ok?`${payload.count||0} notification jobs queued for retry`:payload.error||"Retry failed");
    if(response.ok) await loadIntegrations();
  }

  return <div className="space-y-6">
    <section className="admin-surface overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-red-700 dark:text-red-300"><Palette size={15}/> Appearance studio</p>
          <h2 className="mt-1 text-2xl font-black">Published interface designs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Choose the customer storefront system and the admin workspace style. Every storefront design includes its own light and dark appearance.</p>
        </div>
        <Link href={`/?theme-preview=${normalizeStorefrontTheme(data.storefront_theme)}&layout-preview=${normalizeStorefrontLayout(data.storefront_layout)}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold transition hover:border-red-300 hover:text-red-700 dark:border-slate-700"><ExternalLink size={16}/> Preview selected</Link>
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-3"><div><h3 className="text-base font-black">Customer storefront</h3><p className="mt-1 text-xs text-slate-500">Published globally after saving.</p></div><span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><Sun size={14}/> Light <span className="text-slate-300">/</span> <Moon size={14}/> Dark</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {STOREFRONT_THEMES.map((theme)=>{
            const active=normalizeStorefrontTheme(data.storefront_theme)===theme.id;
            return <button key={theme.id} type="button" onClick={()=>setData({...data,storefront_theme:theme.id})} className={`group relative min-h-48 overflow-hidden rounded-lg border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${active?"border-red-500 bg-red-50/70 ring-2 ring-red-500/15 dark:bg-red-950/20":"border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`} aria-pressed={active}>
              <span className="flex gap-1.5">{theme.colors.map((color)=><i key={color} className="block size-7 rounded-md border border-black/10 shadow-sm" style={{backgroundColor:color}}/>)}</span>
              <strong className="mt-5 block text-sm">{theme.name}</strong>
              <span className="mt-2 block text-xs leading-5 text-slate-500">{theme.description}</span>
              <span className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full transition ${active?"bg-red-600 text-white":"bg-slate-100 text-transparent dark:bg-slate-800"}`}><Check size={14}/></span>
            </button>;
          })}
        </div>
        <div className="mt-7 border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950"><LayoutGrid size={17}/></span>
            <div><h3 className="text-sm font-black">Storefront structure</h3><p className="mt-0.5 text-xs text-slate-500">Combine any structure with any storefront theme.</p></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {STOREFRONT_LAYOUTS.map((layout)=>{
              const active=normalizeStorefrontLayout(data.storefront_layout)===layout.id;
              return <button key={layout.id} type="button" onClick={()=>setData({...data,storefront_layout:layout.id})} className={`relative min-h-32 rounded-lg border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${active?"border-slate-950 bg-slate-950 text-white ring-2 ring-slate-950/15 dark:border-white dark:bg-white dark:text-slate-950":"border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`} aria-pressed={active}>
                <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-black uppercase ${active?"bg-white/12 text-white dark:bg-slate-950/10 dark:text-slate-950":"bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{layout.signature}</span>
                <strong className="mt-3 block text-sm">{layout.name}</strong>
                <span className={`mt-1.5 block text-xs leading-5 ${active?"text-slate-300 dark:text-slate-600":"text-slate-500"}`}>{layout.description}</span>
                {active?<span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-red-600 text-white"><Check size={14}/></span>:null}
              </button>;
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
          <div><strong className="block text-sm">New visitor default</strong><span className="mt-0.5 block text-xs text-slate-500">A customer&apos;s own saved light/dark choice always takes priority.</span></div>
          <div className="inline-grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950">
            <button type="button" onClick={()=>setData({...data,default_theme:"light"})} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-bold ${data.default_theme!=="dark"?"bg-slate-950 text-white dark:bg-white dark:text-slate-950":"text-slate-500"}`}><Sun size={14}/> Light</button>
            <button type="button" onClick={()=>setData({...data,default_theme:"dark"})} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-bold ${data.default_theme==="dark"?"bg-slate-950 text-white dark:bg-white dark:text-slate-950":"text-slate-500"}`}><Moon size={14}/> Dark</button>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-7 dark:border-slate-800">
        <div><h3 className="text-base font-black">Admin workspace</h3><p className="mt-1 text-xs text-slate-500">Choose a visual system, then combine it with an operational layout.</p></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ADMIN_UI_THEMES.map((theme)=>{
            const active=normalizeAdminUiTheme(data.admin_ui_theme)===theme.id;
            return <button key={theme.id} type="button" onClick={()=>setData({...data,admin_ui_theme:theme.id})} className={`relative min-h-36 rounded-lg border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${active?"border-red-500 bg-red-50/70 ring-2 ring-red-500/15 dark:bg-red-950/20":"border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`} aria-pressed={active}>
              <span className="flex gap-1.5">{theme.colors.map((color)=><i key={color} className="block h-7 flex-1 rounded-md border border-black/10" style={{backgroundColor:color}}/>)}</span>
              <strong className="mt-4 block text-sm">{theme.name}</strong><span className="mt-1.5 block text-xs leading-5 text-slate-500">{theme.description}</span>
              {active?<span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-red-600 text-white"><Check size={14}/></span>:null}
            </button>;
          })}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ADMIN_UI_LAYOUTS.map((layout)=>{
            const active=normalizeAdminUiLayout(data.admin_ui_layout)===layout.id;
            return <button key={layout.id} type="button" onClick={()=>setData({...data,admin_ui_layout:layout.id})} className={`relative min-h-32 rounded-lg border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${active?"border-red-500 bg-red-50/70 ring-2 ring-red-500/15 dark:bg-red-950/20":"border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`} aria-pressed={active}>
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-800">{layout.signature}</span>
              <strong className="mt-3 block text-sm">{layout.name}</strong>
              <span className="mt-1.5 block text-xs leading-5 text-slate-500">{layout.description}</span>
              {active?<span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-red-600 text-white"><Check size={14}/></span>:null}
            </button>;
          })}
        </div>
      </div>
    </section>
    <section className="admin-surface p-5">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-red-700 dark:text-red-300">Access policy</p>
      <h2 className="mt-1 text-2xl font-black">Authentication and checkout</h2>
      <p className="mt-2 text-sm text-slate-500">Messaging always requires a logged-in customer. These controls never disable admin authentication.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{AUTH_CONTROLS.map(([key,label,body])=><label key={key} className="flex min-h-24 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><input type="checkbox" className="mt-1 size-4 accent-red-700" checked={data[key]!=="false"} onChange={e=>setData({...data,[key]:String(e.target.checked)})}/><span><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{body}</span></span></label>)}</div>
    </section>
    <section className="admin-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-red-700 dark:text-red-300">Live connectivity</p>
          <h2 className="mt-1 text-2xl font-black">Providers and notification queue</h2>
          <p className="mt-2 text-sm text-slate-500">A provider is never reported as successful when credentials are missing or its latest request failed.</p>
        </div>
        <Button variant="outline" onClick={()=>void retryNotifications()}>Retry failed jobs ({pendingJobs})</Button>
      </div>
      <div className="mt-5 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration)=>{
          const tone=integration.state==="Connected"?"text-emerald-700 dark:text-emerald-300":integration.state==="Failed"?"text-red-700 dark:text-red-300":"text-amber-700 dark:text-amber-300";
          return <article key={integration.key} className="bg-white p-4 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3"><strong>{integration.label}</strong><span className={`text-xs font-black uppercase ${tone}`}>{integration.state}</span></div>
            <p className="mt-2 text-sm text-slate-500">Provider: {integration.provider||"none"}</p>
            {integration.missing?.length?<p className="mt-2 text-xs text-slate-500">Missing: {integration.missing.join(", ")}</p>:null}
            {integration.lastError?<p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">{integration.lastError}</p>:null}
          </article>;
        })}
        {!integrations.length?<div className="bg-white p-5 text-sm text-slate-500 dark:bg-slate-950">Integration status is loading or its migration is pending.</div>:null}
      </div>
    </section>
    <section className="admin-surface p-5">
      <h2 className="text-2xl font-black">General website settings</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{keys.map(k=><label key={k} className="text-sm font-semibold">{k.replaceAll("_"," ")}<textarea className="mt-1 min-h-20 w-full rounded-lg border p-2 dark:bg-slate-900" value={data[k]||""} onChange={e=>setData({...data,[k]:e.target.value})}/></label>)}</div>
    </section>
    <Button variant="accent" disabled={saving} onClick={()=>void save()}><Save size={17}/> {saving?"Saving...":"Save settings"}</Button>
    {toast?<div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div>:null}
  </div>;
}

export function ReportExportButtons(){return <div className="flex flex-wrap gap-2"><a className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold" href="/api/admin/reports/export?format=csv"><Download size={17}/> CSV</a><a className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold" href="/api/admin/reports/export?format=excel"><Download size={17}/> Excel</a><a className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold" href="/api/admin/reports/export?format=pdf"><Download size={17}/> PDF</a></div>;}
