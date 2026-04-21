exports.id=343,exports.ids=[343],exports.modules={4781:(e,t,a)=>{Promise.resolve().then(a.t.bind(a,2994,23)),Promise.resolve().then(a.t.bind(a,6114,23)),Promise.resolve().then(a.t.bind(a,9727,23)),Promise.resolve().then(a.t.bind(a,9671,23)),Promise.resolve().then(a.t.bind(a,1868,23)),Promise.resolve().then(a.t.bind(a,4759,23))},7704:(e,t,a)=>{Promise.resolve().then(a.bind(a,5999))},3053:(e,t,a)=>{Promise.resolve().then(a.bind(a,4037))},4037:(e,t,a)=>{"use strict";a.r(t),a.d(t,{ToastContext:()=>V,default:()=>X,useAppToast:()=>J});var s=a(326),n=a(7577),i=a(434),r=a(5047),l=a(4319),o=a(4061),d=a(7358),c=a(8705),m=a(5964),x=a(6754),p=a(8378),u=a(1810),h=a(9183),f=a(1890),g=a(748),b=a(4019),y=a(1223),v=a(9701),w=a(4345);let j=[{href:"/dashboard",label:"Dashboard",icon:l.Z},{href:"/patients",label:"Patients",icon:o.Z},{href:"/appointments",label:"Appointments",icon:d.Z},{href:"/inventory",label:"Inventory",icon:c.Z},{href:"/billing",label:"Billing",icon:m.Z},{href:"/reports",label:"Reports",icon:x.Z},{href:"/settings",label:"Settings",icon:p.Z}];function N(){let[e,t]=(0,n.useState)(!1),[a,l]=(0,n.useState)(!1),[o,d]=(0,n.useState)("Dental CMS"),[c,m]=(0,n.useState)(null),x=(0,r.usePathname)(),p=(0,r.useRouter)(),N=async()=>{let e=(0,v.e)();await e.auth.signOut(),p.push("/login")},C=({item:t})=>{let a=x===t.href||x.startsWith(t.href+"/");return(0,s.jsxs)(i.default,{href:t.href,onClick:()=>l(!1),className:(0,y.cn)("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",a?"bg-teal-700 text-white shadow-sm":"text-gray-600 hover:bg-gray-100 hover:text-gray-900"),children:[s.jsx(t.icon,{className:"w-5 h-5 flex-shrink-0"}),!e&&s.jsx("span",{children:t.label})]})};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsxs)("aside",{className:(0,y.cn)("hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-gray-100 transition-all duration-300",e?"w-16":"w-60"),children:[s.jsx(({showFull:e=!0})=>(0,s.jsxs)("div",{className:(0,y.cn)("flex items-center gap-3 px-4 py-5 border-b border-gray-100",!e&&"justify-center px-0"),children:[s.jsx(w.y,{size:"sm",logoUrl:c,clinicName:o}),e&&(0,s.jsxs)("div",{className:"min-w-0",children:[s.jsx("p",{className:"text-sm font-bold text-gray-900 leading-tight truncate",children:o}),s.jsx("p",{className:"text-xs text-gray-400",children:"Clinic Management"})]})]}),{showFull:!e}),s.jsx("nav",{className:"flex-1 p-3 space-y-1 overflow-y-auto",children:j.map(e=>s.jsx(C,{item:e},e.href))}),s.jsx("div",{className:"p-3 border-t border-gray-100",children:(0,s.jsxs)("button",{onClick:N,className:(0,y.cn)("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium","text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full",e&&"justify-center"),children:[s.jsx(u.Z,{className:"w-5 h-5 flex-shrink-0"}),!e&&"Log Out"]})}),s.jsx("button",{onClick:()=>t(!e),className:"absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors",children:e?s.jsx(h.Z,{className:"w-3 h-3 text-gray-500"}):s.jsx(f.Z,{className:"w-3 h-3 text-gray-500"})})]}),s.jsx("button",{className:"md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-gray-100",onClick:()=>l(!0),children:s.jsx(g.Z,{className:"w-5 h-5 text-gray-700"})}),a&&(0,s.jsxs)(s.Fragment,{children:[s.jsx("div",{className:"md:hidden fixed inset-0 bg-black/40 z-40",onClick:()=>l(!1)}),(0,s.jsxs)("div",{className:"md:hidden fixed left-0 top-0 h-full w-64 bg-white z-50 shadow-xl flex flex-col",children:[(0,s.jsxs)("div",{className:"flex items-center justify-between px-4 py-5 border-b border-gray-100",children:[(0,s.jsxs)("div",{className:"flex items-center gap-3",children:[s.jsx(w.y,{size:"sm",logoUrl:c,clinicName:o}),(0,s.jsxs)("div",{children:[s.jsx("p",{className:"text-sm font-bold text-gray-900 truncate max-w-[140px]",children:o}),s.jsx("p",{className:"text-xs text-gray-400",children:"Clinic Management"})]})]}),s.jsx("button",{onClick:()=>l(!1),children:s.jsx(b.Z,{className:"w-5 h-5 text-gray-400"})})]}),s.jsx("nav",{className:"flex-1 p-3 space-y-1 overflow-y-auto",children:j.map(e=>s.jsx(C,{item:e},e.href))}),s.jsx("div",{className:"p-3 border-t border-gray-100",children:(0,s.jsxs)("button",{onClick:N,className:"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full",children:[s.jsx(u.Z,{className:"w-5 h-5"})," Log Out"]})})]})]})]})}function C(){let e=(0,r.usePathname)(),t=j.slice(0,5);return s.jsx("nav",{className:"md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 flex",children:t.map(t=>{let a=e===t.href||e.startsWith(t.href+"/");return(0,s.jsxs)(i.default,{href:t.href,className:(0,y.cn)("flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",a?"text-teal-700":"text-gray-400"),children:[s.jsx(t.icon,{className:(0,y.cn)("w-5 h-5",a&&"text-teal-700")}),s.jsx("span",{children:t.label})]},t.href)})})}var k=a(8307),S=a(7506),_=a(9635);function $(){let e=(0,r.useRouter)(),[t,a]=(0,n.useState)(!1),[i,l]=(0,n.useState)(""),[o,c]=(0,n.useState)([]),[m,x]=(0,n.useState)(!1),[p,u]=(0,n.useState)(0),h=(0,n.useRef)(null),f=(0,n.useRef)(null),g=(0,n.useRef)(),w=(0,n.useCallback)(async e=>{if(!e.trim()||e.length<2){c([]),x(!1);return}x(!0);let t=(0,v.e)(),[a,s]=await Promise.all([t.from("patients").select("*").or(`first_name.ilike.%${e}%,last_name.ilike.%${e}%,contact_number.ilike.%${e}%,email.ilike.%${e}%`).eq("archived",!1).limit(5),t.from("appointments").select("*, patient:patients(first_name, last_name)").or(`treatment_type.ilike.%${e}%`).order("appointment_date",{ascending:!1}).limit(3)]),n=[];for(let e of a.data??[])n.push({type:"patient",id:e.id,title:(0,y.DF)(e),subtitle:e.contact_number??e.email??"No contact info",href:`/patients/${e.id}`});for(let e of s.data??[])n.push({type:"appointment",id:e.id,title:(0,y.DF)(e.patient)+" — "+e.treatment_type,subtitle:`${(0,y.p6)(e.appointment_date)} at ${(0,y.mr)(e.appointment_time)} \xb7 ${e.status}`,href:`/appointments?id=${e.id}`});c(n),u(0),x(!1)},[]);function j(t){e.push(t.href),a(!1),l(""),c([])}let N=t&&i.length>=2;return(0,s.jsxs)("div",{ref:f,className:"relative",children:[(0,s.jsxs)("div",{className:"relative",children:[s.jsx(k.Z,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"}),s.jsx("input",{ref:h,type:"text",value:i,onChange:function(e){let t=e.target.value;l(t),a(!0),clearTimeout(g.current),g.current=setTimeout(()=>w(t),300)},onFocus:()=>a(!0),onKeyDown:function(e){if(o.length){if("ArrowDown"===e.key)e.preventDefault(),u(e=>Math.min(e+1,o.length-1));else if("ArrowUp"===e.key)e.preventDefault(),u(e=>Math.max(e-1,0));else if("Enter"===e.key){e.preventDefault();let t=o[p];t&&j(t)}}},placeholder:"Search… ( / )",className:"w-40 sm:w-56 pl-9 pr-8 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-300 transition-all"}),i&&s.jsx("button",{onClick:()=>{l(""),c([]),a(!1)},className:"absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500",children:s.jsx(b.Z,{className:"w-3.5 h-3.5"})})]}),N&&s.jsx("div",{className:"absolute top-full mt-2 left-0 w-80 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden animate-in",children:m?(0,s.jsxs)("div",{className:"flex items-center gap-2 px-4 py-4 text-sm text-gray-400",children:[s.jsx(S.Z,{className:"w-4 h-4 animate-spin"}),"Searching…"]}):0===o.length?(0,s.jsxs)("div",{className:"px-4 py-6 text-center text-sm text-gray-400",children:['No results for "',s.jsx("span",{className:"font-medium text-gray-600",children:i}),'"']}):(0,s.jsxs)("div",{children:[["patient","appointment"].map(e=>{let t=o.filter(t=>t.type===e);return t.length?(0,s.jsxs)("div",{children:[s.jsx("div",{className:"px-4 py-2 bg-gray-50 border-b border-gray-100",children:s.jsx("p",{className:"text-xs font-semibold text-gray-400 uppercase tracking-wider",children:"patient"===e?"Patients":"Appointments"})}),t.map((e,t)=>{let a=o.indexOf(e);return(0,s.jsxs)("button",{onClick:()=>j(e),className:(0,y.cn)("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",p===a?"bg-teal-50":"hover:bg-gray-50"),children:[s.jsx("div",{className:(0,y.cn)("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0","patient"===e.type?"bg-teal-100":"bg-blue-100"),children:"patient"===e.type?s.jsx(_.Z,{className:"w-4 h-4 text-teal-700"}):s.jsx(d.Z,{className:"w-4 h-4 text-blue-600"})}),(0,s.jsxs)("div",{className:"flex-1 min-w-0",children:[s.jsx("p",{className:"text-sm font-medium text-gray-900 truncate",children:e.title}),s.jsx("p",{className:"text-xs text-gray-400 truncate",children:e.subtitle})]})]},e.id)})]},e):null}),s.jsx("div",{className:"px-4 py-2 border-t border-gray-50 bg-gray-50",children:s.jsx("p",{className:"text-xs text-gray-400",children:"↑↓ navigate \xa0\xb7\xa0 Enter to open \xa0\xb7\xa0 Esc to close"})})]})})]})}var D=a(1291),P=a(6507),Z=a(7211),M=a(2933);let T={low_stock:{icon:c.Z,bg:"bg-red-100",color:"text-red-600",label:"Inventory"},appointment:{icon:d.Z,bg:"bg-blue-100",color:"text-blue-600",label:"Appointment"},balance:{icon:D.Z,bg:"bg-amber-100",color:"text-amber-600",label:"Balance"}};function z(){let e=(0,r.useRouter)(),[t,a]=(0,n.useState)(!1),[i,l]=(0,n.useState)([]),[o,d]=(0,n.useState)(!1),[c,m]=(0,n.useState)(!1),[x,p]=(0,n.useState)(null),u=(0,n.useRef)(null),h=i.filter(e=>!e.read).length,f=(0,n.useCallback)(async()=>{if(!x)return;d(!0);let e=(0,v.e)(),{data:t}=await e.from("notifications").select("*").eq("clinic_id",x).order("created_at",{ascending:!1}).limit(30);l(t??[]),d(!1)},[x]),g=(0,n.useCallback)(async()=>{if(!x)return;m(!0);let e=(0,v.e)(),t=new Date,a=t.toISOString().split("T")[0],s=new Date(t.getTime()+36e5),n=`${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}`,i=`${s.getHours().toString().padStart(2,"0")}:${s.getMinutes().toString().padStart(2,"0")}`,[r,l,o,d,c]=await Promise.all([e.from("inventory_items").select("item_name, quantity, reorder_level"),e.from("appointments").select("*, patient:patients(first_name, last_name)").eq("appointment_date",a).in("status",["Scheduled","Confirmed"]).gte("appointment_time",n).lte("appointment_time",i),e.from("billing").select("patient_id, amount_charged"),e.from("payments").select("patient_id, amount_paid"),e.from("patients").select("id, first_name, last_name").eq("archived",!1)]),p=[];for(let e of r.data??[])e.quantity<=e.reorder_level&&p.push({clinic_id:x,title:"Low Stock Alert",body:`${e.item_name} is running low (${e.quantity} remaining, reorder at ${e.reorder_level}).`,type:"low_stock",read:!1,href:"/inventory"});for(let e of l.data??[]){let t=e.patient?`${e.patient.first_name} ${e.patient.last_name}`:"A patient";p.push({clinic_id:x,title:"Upcoming Appointment",body:`${t} has a ${e.treatment_type} appointment starting soon.`,type:"appointment",read:!1,href:`/appointments?id=${e.id}`})}let u=o.data??[],h=d.data??[],g=c.data??[],b={};for(let e of u)b[e.patient_id]=(b[e.patient_id]??0)+e.amount_charged;for(let e of h)b[e.patient_id]=(b[e.patient_id]??0)-e.amount_paid;for(let[e,t]of Object.entries(b))if(t>0){let a=g.find(t=>t.id===e);if(!a)continue;p.push({clinic_id:x,title:"Outstanding Balance",body:`${a.first_name} ${a.last_name} has an unpaid balance of ${(0,y.V2)(t)}.`,type:"balance",read:!1,href:"/billing"})}p.length>0&&(await e.from("notifications").delete().eq("clinic_id",x).eq("read",!1),await e.from("notifications").insert(p)),await f(),m(!1)},[x,f]);async function w(){if(!x)return;let e=(0,v.e)();await e.from("notifications").update({read:!0}).eq("clinic_id",x).eq("read",!1),f()}async function j(e){let t=(0,v.e)();await t.from("notifications").update({read:!0}).eq("id",e),l(t=>t.map(t=>t.id===e?{...t,read:!0}:t))}async function N(e){let t=(0,v.e)();await t.from("notifications").delete().eq("id",e),l(t=>t.filter(t=>t.id!==e))}return(0,s.jsxs)("div",{ref:u,className:"relative",children:[(0,s.jsxs)("button",{onClick:()=>{a(e=>!e),!t&&x&&g()},className:"relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors",title:"Notifications",children:[s.jsx(P.Z,{className:"w-5 h-5"}),h>0&&s.jsx("span",{className:(0,y.cn)("absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1","bg-red-500 text-white text-[10px] font-bold rounded-full","flex items-center justify-center leading-none"),children:h>99?"99+":h}),c&&s.jsx("span",{className:"absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-teal-500 rounded-full flex items-center justify-center",children:s.jsx(S.Z,{className:"w-2 h-2 text-white animate-spin"})})]}),t&&(0,s.jsxs)("div",{className:"absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden animate-in",children:[(0,s.jsxs)("div",{className:"flex items-center justify-between px-4 py-3.5 border-b border-gray-100",children:[(0,s.jsxs)("div",{className:"flex items-center gap-2",children:[s.jsx("h3",{className:"font-semibold text-gray-900",children:"Notifications"}),h>0&&(0,s.jsxs)("span",{className:"text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full",children:[h," new"]})]}),(0,s.jsxs)("div",{className:"flex items-center gap-1",children:[h>0&&(0,s.jsxs)("button",{onClick:w,className:"flex items-center gap-1 text-xs text-teal-700 hover:underline font-medium px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors",children:[s.jsx(Z.Z,{className:"w-3.5 h-3.5"})," Mark all read"]}),s.jsx("button",{onClick:()=>a(!1),className:"p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors",children:s.jsx(b.Z,{className:"w-4 h-4"})})]})]}),s.jsx("div",{className:"max-h-[420px] overflow-y-auto",children:o||c?(0,s.jsxs)("div",{className:"flex items-center justify-center gap-2 py-10 text-gray-400 text-sm",children:[s.jsx(S.Z,{className:"w-4 h-4 animate-spin"}),c?"Checking for alerts…":"Loading…"]}):0===i.length?(0,s.jsxs)("div",{className:"py-12 text-center",children:[s.jsx(P.Z,{className:"w-8 h-8 text-gray-200 mx-auto mb-3"}),s.jsx("p",{className:"text-sm text-gray-400 font-medium",children:"You're all caught up"}),s.jsx("p",{className:"text-xs text-gray-300 mt-1",children:"No alerts at this time"})]}):s.jsx("div",{className:"divide-y divide-gray-50",children:i.map(t=>{let n=T[t.type],i=n.icon;return(0,s.jsxs)("div",{className:(0,y.cn)("flex items-start gap-3 px-4 py-3.5 group transition-colors",!t.read&&"bg-blue-50/40",t.href&&"cursor-pointer hover:bg-gray-50"),onClick:()=>t.href&&void(j(t.id),t.href&&e.push(t.href),a(!1)),children:[s.jsx("div",{className:(0,y.cn)("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",n.bg),children:s.jsx(i,{className:(0,y.cn)("w-4 h-4",n.color)})}),(0,s.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,s.jsxs)("div",{className:"flex items-start justify-between gap-2",children:[s.jsx("p",{className:(0,y.cn)("text-sm font-semibold leading-snug",t.read?"text-gray-600":"text-gray-900"),children:t.title}),(0,s.jsxs)("div",{className:"flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",children:[!t.read&&s.jsx("button",{onClick:e=>{e.stopPropagation(),j(t.id)},className:"p-1 rounded text-gray-300 hover:text-teal-500 transition-colors",title:"Mark as read",children:s.jsx(M.Z,{className:"w-3.5 h-3.5"})}),s.jsx("button",{onClick:e=>{e.stopPropagation(),N(t.id)},className:"p-1 rounded text-gray-300 hover:text-red-400 transition-colors",title:"Dismiss",children:s.jsx(b.Z,{className:"w-3.5 h-3.5"})})]})]}),s.jsx("p",{className:"text-xs text-gray-500 mt-0.5 leading-snug",children:t.body}),(0,s.jsxs)("div",{className:"flex items-center gap-2 mt-1.5",children:[s.jsx("span",{className:(0,y.cn)("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",n.bg,n.color),children:n.label}),s.jsx("span",{className:"text-[10px] text-gray-400",children:function(e){let t=Math.floor((Date.now()-new Date(e).getTime())/1e3);return t<60?"Just now":t<3600?`${Math.floor(t/60)}m ago`:t<86400?`${Math.floor(t/3600)}h ago`:`${Math.floor(t/86400)}d ago`}(t.created_at)}),!t.read&&s.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"})]})]})]},t.id)})})}),i.length>0&&(0,s.jsxs)("div",{className:"px-4 py-3 border-t border-gray-50 bg-gray-50 flex items-center justify-between",children:[(0,s.jsxs)("p",{className:"text-xs text-gray-400",children:[i.length," notification",1!==i.length?"s":""]}),s.jsx("button",{onClick:async()=>{let e=(0,v.e)();await e.from("notifications").delete().eq("clinic_id",x).eq("read",!0),f()},className:"text-xs text-gray-400 hover:text-red-500 hover:underline transition-colors",children:"Clear read"})]})]})]})}var A=a(3869);let q={"/dashboard":"Dashboard","/patients":"Patients","/appointments":"Appointments","/inventory":"Inventory","/billing":"Billing","/reports":"Reports","/settings":"Settings"};function R(){let e=(0,r.usePathname)(),t=function(e){if(e.startsWith("/patients/new"))return"New Patient";if(e.startsWith("/patients/"))return"Patient Profile";if(e.startsWith("/appointments/new"))return"New Appointment";for(let[t,a]of Object.entries(q))if(e===t||e.startsWith(t+"/"))return a;return"Dental CMS"}(e),{printSchedule:a}={printSchedule:async function(e){let t=(0,v.e)(),a=e??new Date().toISOString().split("T")[0],{data:s,error:n}=await t.from("appointments").select("*, patient:patients(*), dentist:dentists(name)").eq("appointment_date",a).order("appointment_time",{ascending:!0});if(n||!s){alert("Failed to load schedule. Please try again.");return}let{data:{user:i}}=await t.auth.getUser(),r="Dental Clinic";if(i){let{data:e}=await t.from("staff").select("clinic_id").eq("auth_user_id",i.id).single();if(e){let{data:a}=await t.from("clinics").select("name").eq("id",e.clinic_id).single();a&&(r=a.name)}}let l=(0,y.p6)(a),o=new Date().toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"}),d={Scheduled:"#dbeafe",Confirmed:"#ccfbf1",Done:"#dcfce7","No-show":"#fee2e2",Cancelled:"#f1f5f9"},c=`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Daily Schedule — ${l}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 13px;
            color: #1e293b;
            background: white;
            padding: 32px;
          }
          .header {
            border-bottom: 2px solid #0f766e;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .clinic-name {
            font-size: 20px;
            font-weight: 700;
            color: #0f766e;
          }
          .schedule-title {
            font-size: 15px;
            font-weight: 600;
            color: #334155;
            margin-top: 4px;
          }
          .meta {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 4px;
          }
          .summary {
            display: flex;
            gap: 24px;
            margin-bottom: 20px;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .summary-item { text-align: center; }
          .summary-number { font-size: 22px; font-weight: 700; color: #0f766e; }
          .summary-label { font-size: 10px; color: #94a3b8; margin-top: 2px; }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead tr {
            background: #0f766e;
            color: white;
          }
          thead th {
            padding: 10px 12px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          tbody tr {
            border-bottom: 1px solid #f1f5f9;
          }
          tbody tr:hover { background: #f8fafc; }
          tbody td {
            padding: 11px 12px;
            vertical-align: middle;
          }
          .time-cell {
            font-weight: 700;
            color: #0f766e;
            white-space: nowrap;
            width: 80px;
          }
          .patient-name { font-weight: 600; color: #1e293b; }
          .patient-contact { font-size: 11px; color: #94a3b8; margin-top: 2px; }
          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
          }
          .notes-cell { font-size: 11px; color: #64748b; font-style: italic; }
          .empty {
            text-align: center;
            padding: 48px;
            color: #94a3b8;
            font-size: 14px;
          }
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 20px; }
            @page { margin: 16mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">${r}</div>
          <div class="schedule-title">Daily Appointment Schedule</div>
          <div class="meta">${l} &nbsp;\xb7&nbsp; Printed at ${o}</div>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-number">${s.length}</div>
            <div class="summary-label">Total</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${s.filter(e=>"Confirmed"===e.status).length}</div>
            <div class="summary-label">Confirmed</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${s.filter(e=>"Done"===e.status).length}</div>
            <div class="summary-label">Done</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${s.filter(e=>"No-show"===e.status).length}</div>
            <div class="summary-label">No-show</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${s.filter(e=>"Cancelled"===e.status).length}</div>
            <div class="summary-label">Cancelled</div>
          </div>
        </div>

        ${0===s.length?`<div class="empty">No appointments scheduled for ${l}.</div>`:`<table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Treatment</th>
                  <th>Dentist</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${s.map(e=>`
                  <tr>
                    <td class="time-cell">${(0,y.mr)(e.appointment_time)}</td>
                    <td>
                      <div class="patient-name">${(0,y.DF)(e.patient)}</div>
                      ${e.patient?.contact_number?`<div class="patient-contact">${e.patient.contact_number}</div>`:""}
                    </td>
                    <td>${e.treatment_type}</td>
                    <td>${e.dentist?.name??"—"}</td>
                    <td>
                      <span class="status-badge" style="background:${d[e.status]??"#f1f5f9"}">
                        ${e.status}
                      </span>
                    </td>
                    <td class="notes-cell">${e.notes??""}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>`}

        <div class="footer">
          <span>${r} — Confidential Patient Schedule</span>
          <span>Dental CMS \xb7 ${l}</span>
        </div>
      </body>
      </html>
    `,m=window.open("","_blank","width=900,height=700");if(!m){alert("Pop-up blocked. Please allow pop-ups for this site and try again.");return}m.document.write(c),m.document.close(),m.focus(),setTimeout(()=>{m.print()},500)}},[i,l]=(0,n.useState)(null),[o,d]=(0,n.useState)("A"),[c,m]=(0,n.useState)(!1);async function x(){m(!0),await a(),m(!1)}let p="/appointments"===e||e.startsWith("/appointments");return(0,s.jsxs)("header",{className:"bg-white border-b border-gray-100 px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 gap-3",children:[s.jsx("h1",{className:"text-lg font-semibold text-gray-900 ml-10 md:ml-0 flex-shrink-0",children:t}),(0,s.jsxs)("div",{className:"flex items-center gap-2",children:[s.jsx($,{}),p&&(0,s.jsxs)("button",{onClick:x,disabled:c,title:"Print today's schedule",className:"flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors disabled:opacity-50 hidden sm:flex",children:[s.jsx(A.Z,{className:"w-4 h-4"}),s.jsx("span",{className:"hidden md:inline",children:"Print"})]}),s.jsx(z,{}),s.jsx("div",{className:"w-8 h-8 rounded-full overflow-hidden flex-shrink-0",children:i?s.jsx("img",{src:i,alt:"Profile",className:"w-full h-full object-cover"}):s.jsx("div",{className:"w-full h-full bg-teal-700 flex items-center justify-center",children:s.jsx("span",{className:"text-white text-xs font-semibold",children:o})})})]})]})}var O=a(361),F=a(9669),I=a(8019),W=a(949);let B={success:s.jsx(O.Z,{className:"w-5 h-5 text-green-500"}),error:s.jsx(F.Z,{className:"w-5 h-5 text-red-500"}),info:s.jsx(I.Z,{className:"w-5 h-5 text-blue-500"}),warning:s.jsx(W.Z,{className:"w-5 h-5 text-amber-500"})},L={success:"border-green-200 bg-green-50",error:"border-red-200 bg-red-50",info:"border-blue-200 bg-blue-50",warning:"border-amber-200 bg-amber-50"};function U({toast:e,onRemove:t}){return(0,s.jsxs)("div",{className:(0,y.cn)("flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg","animate-in slide-in-from-right-5 fade-in-0 duration-300","w-full max-w-sm",L[e.type]),children:[B[e.type],s.jsx("p",{className:"flex-1 text-sm text-gray-800 font-medium",children:e.message}),s.jsx("button",{onClick:()=>t(e.id),className:"text-gray-400 hover:text-gray-600",children:s.jsx(b.Z,{className:"w-4 h-4"})})]})}function H({toasts:e,onRemove:t}){return 0===e.length?null:s.jsx("div",{className:"fixed bottom-6 right-4 z-[100] flex flex-col gap-2 items-end",children:e.map(e=>s.jsx(U,{toast:e,onRemove:t},e.id))})}function Y(){let[e,t]=(0,n.useState)(!0),[a,i]=(0,n.useState)(!1),[r,l]=(0,n.useState)(null),[o,d]=(0,n.useState)("Dental CMS");return e?(0,s.jsxs)("div",{className:`fixed inset-0 z-[999] bg-white flex flex-col items-center justify-center
        transition-opacity duration-400 ease-in-out ${a?"opacity-0":"opacity-100"}`,style:{transitionDuration:"400ms"},children:[(0,s.jsxs)("div",{className:`flex flex-col items-center gap-4 transition-all duration-700
        ${a?"scale-95 opacity-0":"scale-100 opacity-100"}`,style:{animation:a?void 0:"splashIn 0.6s ease-out forwards"},children:[s.jsx(w.y,{size:"lg",logoUrl:r,clinicName:o}),(0,s.jsxs)("div",{className:"text-center",children:[s.jsx("p",{className:"text-xl font-bold text-gray-900",children:o}),s.jsx("p",{className:"text-sm text-gray-400 mt-0.5",children:"Clinic Management System"})]}),s.jsx("div",{className:"flex gap-1.5 mt-2",children:[0,1,2].map(e=>s.jsx("div",{className:"w-1.5 h-1.5 rounded-full bg-teal-300",style:{animation:`dotPulse 1.2s ease-in-out ${.2*e}s infinite`}},e))})]}),s.jsx("style",{children:`
        @keyframes splashIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.2); }
        }
      `})]}):null}var E=a(6384);let V=(0,n.createContext)({success:()=>{},error:()=>{},info:()=>{},warning:()=>{}}),J=()=>(0,n.useContext)(V);function X({children:e}){let{toasts:t,toast:a,removeToast:n}=(0,E.p)();return(0,s.jsxs)(V.Provider,{value:a,children:[s.jsx(Y,{}),(0,s.jsxs)("div",{className:"flex h-screen overflow-hidden bg-gray-50",children:[s.jsx(N,{}),(0,s.jsxs)("div",{className:"flex-1 flex flex-col min-w-0 overflow-hidden",children:[s.jsx(R,{}),s.jsx("main",{className:"flex-1 overflow-y-auto pb-20 md:pb-6",children:s.jsx("div",{className:"p-4 md:p-6 max-w-7xl mx-auto",children:e})})]})]}),s.jsx(C,{}),s.jsx(H,{toasts:t,onRemove:n})]})}},4345:(e,t,a)=>{"use strict";a.d(t,{R:()=>i,y:()=>r});var s=a(326),n=a(1223);function i({className:e,size:t=24}){return(0,s.jsxs)("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg",className:e,children:[s.jsx("path",{d:"M12 2C9.5 2 7.5 3.5 6.5 5C5.5 3.5 4 3 3 3.5C1.5 4.5 2 7 2.5 8.5C3 10 3 11 3 12C3 15 4 19 5.5 20.5C6.5 21.5 7.5 21 8 20C8.5 19 9 17 9.5 16C10 15 11 14.5 12 14.5C13 14.5 14 15 14.5 16C15 17 15.5 19 16 20C16.5 21 17.5 21.5 18.5 20.5C20 19 21 15 21 12C21 11 21 10 21.5 8.5C22 7 22.5 4.5 21 3.5C20 3 18.5 3.5 17.5 5C16.5 3.5 14.5 2 12 2Z",fill:"currentColor",opacity:"0.15",strokeWidth:"0"}),s.jsx("path",{d:"M12 2C9.5 2 7.5 3.5 6.5 5C5.5 3.5 4 3 3 3.5C1.5 4.5 2 7 2.5 8.5C3 10 3 11 3 12C3 15 4 19 5.5 20.5C6.5 21.5 7.5 21 8 20C8.5 19 9 17 9.5 16C10 15 11 14.5 12 14.5C13 14.5 14 15 14.5 16C15 17 15.5 19 16 20C16.5 21 17.5 21.5 18.5 20.5C20 19 21 15 21 12C21 11 21 10 21.5 8.5C22 7 22.5 4.5 21 3.5C20 3 18.5 3.5 17.5 5C16.5 3.5 14.5 2 12 2Z",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round"})]})}function r({size:e="md",logoUrl:t,clinicName:a,className:r}){let l={sm:"w-8 h-8 rounded-lg",md:"w-10 h-10 rounded-xl",lg:"w-16 h-16 rounded-2xl"};return t?s.jsx("div",{className:(0,n.cn)(l[e],"overflow-hidden flex-shrink-0 bg-white border border-gray-100",r),children:s.jsx("img",{src:t,alt:a??"Clinic logo",className:"w-full h-full object-cover"})}):s.jsx("div",{className:(0,n.cn)(l[e],"bg-teal-700 flex items-center justify-center flex-shrink-0 shadow-sm",r),children:s.jsx(i,{size:{sm:18,md:22,lg:36}[e],className:"text-white"})})}},6384:(e,t,a)=>{"use strict";a.d(t,{p:()=>n});var s=a(7577);function n(){let[e,t]=(0,s.useState)([]),a=(0,s.useCallback)((e,a="info")=>{let s=Math.random().toString(36).slice(2);t(t=>[...t,{id:s,message:e,type:a}]),setTimeout(()=>{t(e=>e.filter(e=>e.id!==s))},4e3)},[]);return{toasts:e,toast:{success:e=>a(e,"success"),error:e=>a(e,"error"),info:e=>a(e,"info"),warning:e=>a(e,"warning")},removeToast:(0,s.useCallback)(e=>{t(t=>t.filter(t=>t.id!==e))},[])}}},9701:(e,t,a)=>{"use strict";a.d(t,{e:()=>n});var s=a(7097);function n(){return(0,s.createBrowserClient)("https://qggwzhewtiwhpdxupkqe.supabase.co","sb_publishable_ribRVLD7axLLRk9Vuy6SRQ_5XYMBORD")}},1223:(e,t,a)=>{"use strict";a.d(t,{DF:()=>m,Fw:()=>c,NH:()=>x,TS:()=>p,V2:()=>d,cn:()=>i,jU:()=>g,l:()=>f,mn:()=>l,mr:()=>o,ni:()=>u,p6:()=>r,yh:()=>h});var s=a(1135),n=a(1009);function i(...e){return(0,n.m6)((0,s.W)(e))}function r(e){return e?new Date(e+"T00:00:00").toLocaleDateString("en-PH",{year:"numeric",month:"long",day:"numeric"}):"—"}function l(e){return e?new Date(e+"T00:00:00").toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}):"—"}function o(e){if(!e)return"—";let[t,a]=e.split(":").map(Number);return`${t%12||12}:${a.toString().padStart(2,"0")} ${t>=12?"PM":"AM"}`}function d(e){return null==e?"₱0.00":new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",minimumFractionDigits:2}).format(e)}function c(e){if(!e)return null;let t=new Date,a=new Date(e),s=t.getFullYear()-a.getFullYear(),n=t.getMonth()-a.getMonth();return(n<0||0===n&&t.getDate()<a.getDate())&&s--,s}function m(e){return e?`${e.first_name} ${e.last_name}`:"Unknown Patient"}function x(e,t){return t<=0?"Unpaid":t>=e?"Paid":"Partial"}function p(){return new Date().toISOString().split("T")[0]}function u(e){let t=new Date,a=new Date(e),s=Math.floor((t.getTime()-a.getTime())/1e3);return s<60?"Just now":s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`}let h={Scheduled:"bg-blue-100 text-blue-700 border-blue-200",Confirmed:"bg-teal-100 text-teal-700 border-teal-200",Done:"bg-green-100 text-green-700 border-green-200","No-show":"bg-red-100 text-red-700 border-red-200",Cancelled:"bg-gray-100 text-gray-600 border-gray-200",Paid:"bg-green-100 text-green-700 border-green-200",Partial:"bg-amber-100 text-amber-700 border-amber-200",Unpaid:"bg-red-100 text-red-700 border-red-200"},f=["Dental Cleaning","Tooth Filling","Tooth Extraction","Root Canal","Braces Installation","Braces Adjustment","Braces Consultation","Retainer Check","Wisdom Tooth Surgery","Dental X-ray","Teeth Whitening","Denture Fitting","Oral Surgery Consult","Crown Installation","Bridge Installation","Fluoride Treatment","Sealant Application","Oral Prophylaxis"],g=["PPE","Restorative","Anesthesia","Consumable","Surgical","Imaging","Instruments","Hygiene","Antiseptic","Orthodontics"]},6989:(e,t,a)=>{"use strict";a.r(t),a.d(t,{ToastContext:()=>n,default:()=>r,useAppToast:()=>i});var s=a(8570);let n=(0,s.createProxy)(String.raw`D:\OneDrive\Desktop\dental-cms\src\app\(dashboard)\layout.tsx#ToastContext`),i=(0,s.createProxy)(String.raw`D:\OneDrive\Desktop\dental-cms\src\app\(dashboard)\layout.tsx#useAppToast`),r=(0,s.createProxy)(String.raw`D:\OneDrive\Desktop\dental-cms\src\app\(dashboard)\layout.tsx#default`)},2029:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>l,metadata:()=>i,viewport:()=>r});var s=a(9510);a(5023);var n=a(1032);let i={title:"Dental CMS",description:"Clinic management system for dental practices",manifest:"/manifest.json",icons:{icon:"/logo.png",apple:"/logo.png"},appleWebApp:{capable:!0,statusBarStyle:"default",title:"Dental CMS"}},r={themeColor:"#0f766e"};function l({children:e}){return s.jsx("html",{lang:"en",children:(0,s.jsxs)("body",{children:[e,s.jsx(n.x7,{position:"top-right",richColors:!0})]})})}},5023:()=>{}};