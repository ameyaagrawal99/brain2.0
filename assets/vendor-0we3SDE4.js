import{r as ue}from"./react-vendor-CmGSpuP4.js";let bt={data:""},vt=e=>{if(typeof window=="object"){let r=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return r.nonce=window.__nonce__,r.parentNode||(e||document.head).appendChild(r),r.firstChild}return e||bt},xt=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,wt=/\/\*[^]*?\*\/|  +/g,Fe=/\n+/g,oe=(e,r)=>{let a="",n="",c="";for(let l in e){let i=e[l];l[0]=="@"?l[1]=="i"?a=l+" "+i+";":n+=l[1]=="f"?oe(i,l):l+"{"+oe(i,l[1]=="k"?"":r)+"}":typeof i=="object"?n+=oe(i,r?r.replace(/([^,])+/g,h=>l.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,d=>/&/.test(d)?d.replace(/&/g,h):h?h+" "+d:d)):l):i!=null&&(l=/^--/.test(l)?l:l.replace(/[A-Z]/g,"-$&").toLowerCase(),c+=oe.p?oe.p(l,i):l+":"+i+";")}return a+(r&&c?r+"{"+c+"}":c)+n},K={},We=e=>{if(typeof e=="object"){let r="";for(let a in e)r+=a+We(e[a]);return r}return e},Mt=(e,r,a,n,c)=>{let l=We(e),i=K[l]||(K[l]=(d=>{let b=0,z=11;for(;b<d.length;)z=101*z+d.charCodeAt(b++)>>>0;return"go"+z})(l));if(!K[i]){let d=l!==e?e:(b=>{let z,S,L=[{}];for(;z=xt.exec(b.replace(wt,""));)z[4]?L.shift():z[3]?(S=z[3].replace(Fe," ").trim(),L.unshift(L[0][S]=L[0][S]||{})):L[0][z[1]]=z[2].replace(Fe," ").trim();return L[0]})(e);K[i]=oe(c?{["@keyframes "+i]:d}:d,a?"":"."+i)}let h=a&&K.g?K.g:null;return a&&(K.g=K[i]),((d,b,z,S)=>{S?b.data=b.data.replace(S,d):b.data.indexOf(d)===-1&&(b.data=z?d+b.data:b.data+d)})(K[i],r,n,h),i},_t=(e,r,a)=>e.reduce((n,c,l)=>{let i=r[l];if(i&&i.call){let h=i(a),d=h&&h.props&&h.props.className||/^go/.test(h)&&h;i=d?"."+d:h&&typeof h=="object"?h.props?"":oe(h,""):h===!1?"":h}return n+c+(i??"")},"");function Ae(e){let r=this||{},a=e.call?e(r.p):e;return Mt(a.unshift?a.raw?_t(a,[].slice.call(arguments,1),r.p):a.reduce((n,c)=>Object.assign(n,c&&c.call?c(r.p):c),{}):a,vt(r.target),r.g,r.o,r.k)}let Ue,ze,Ne;Ae.bind({g:1});let ba=Ae.bind({k:1});function va(e,r,a,n){oe.p=r,Ue=e,ze=a,Ne=n}function xa(e,r){let a=this||{};return function(){let n=arguments;function c(l,i){let h=Object.assign({},l),d=h.className||c.className;a.p=Object.assign({theme:ze&&ze()},h),a.o=/ *go\d+/.test(d),h.className=Ae.apply(a,n)+(d?" "+d:"");let b=e;return e[0]&&(b=h.as||e,delete h.as),Ne&&b[0]&&Ne(h),Ue(b,h)}return c}}/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye=(...e)=>e.filter((r,a,n)=>!!r&&r.trim()!==""&&n.indexOf(r)===a).join(" ").trim();/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zt=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(r,a,n)=>n?n.toUpperCase():a.toLowerCase());/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qe=e=>{const r=zt(e);return r.charAt(0).toUpperCase()+r.slice(1)};/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Nt={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $t=e=>{for(const r in e)if(r.startsWith("aria-")||r==="role"||r==="title")return!0;return!1};/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const At=ue.forwardRef(({color:e="currentColor",size:r=24,strokeWidth:a=2,absoluteStrokeWidth:n,className:c="",children:l,iconNode:i,...h},d)=>ue.createElement("svg",{ref:d,...Nt,width:r,height:r,stroke:e,strokeWidth:n?Number(a)*24/Number(r):a,className:Ye("lucide",c),...!l&&!$t(h)&&{"aria-hidden":"true"},...h},[...i.map(([b,z])=>ue.createElement(b,z)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s=(e,r)=>{const a=ue.forwardRef(({className:n,...c},l)=>ue.createElement(At,{ref:l,iconNode:r,className:Ye(`lucide-${Ct(qe(e))}`,`lucide-${e}`,n),...c}));return a.displayName=qe(e),a};/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jt=[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]],wa=s("archive",jt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const St=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]],Ma=s("arrow-right",St);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const It=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742",key:"178tsu"}],["path",{d:"m2 2 20 20",key:"1ooewy"}],["path",{d:"M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05",key:"1hqiys"}]],_a=s("bell-off",It);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lt=[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]],Ca=s("bell",Lt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=[["path",{d:"M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",key:"mg9rjx"}]],za=s("bold",Pt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tt=[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]],Na=s("book-open",Tt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rt=[["path",{d:"M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",key:"oz39mx"}],["path",{d:"m9 10 2 2 4-4",key:"1gnqz4"}]],$a=s("bookmark-check",Rt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ft=[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]],Aa=s("bot",Ft);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qt=[["path",{d:"M12 18V5",key:"adv99a"}],["path",{d:"M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4",key:"1e3is1"}],["path",{d:"M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5",key:"1gqd8o"}],["path",{d:"M17.997 5.125a4 4 0 0 1 2.526 5.77",key:"iwvgf7"}],["path",{d:"M18 18a4 4 0 0 0 2-7.464",key:"efp6ie"}],["path",{d:"M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517",key:"1gq6am"}],["path",{d:"M6 18a4 4 0 0 1-2-7.464",key:"k1g0md"}],["path",{d:"M6.003 5.125a4 4 0 0 0-2.526 5.77",key:"q97ue3"}]],ja=s("brain",qt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ot=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]],Sa=s("calendar-days",Ot);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vt=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],Ia=s("calendar",Vt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Et=[["path",{d:"M5 21v-6",key:"1hz6c0"}],["path",{d:"M12 21V3",key:"1lcnhd"}],["path",{d:"M19 21V9",key:"unv183"}]],La=s("chart-no-axes-column",Et);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ht=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],Pa=s("check",Ht);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bt=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],Ta=s("chevron-down",Bt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dt=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],Ra=s("chevron-left",Dt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gt=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],Fa=s("chevron-right",Gt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wt=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],qa=s("chevron-up",Wt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ut=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],Oa=s("circle-alert",Ut);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yt=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],Va=s("circle-check-big",Yt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],Ea=s("circle-check",Zt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["rect",{x:"9",y:"9",width:"6",height:"6",rx:"1",key:"1ssd4o"}]],Ha=s("circle-stop",Kt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6h4",key:"135r8i"}]],Ba=s("clock-3",Jt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]],Da=s("clock",Qt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xt=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],Ga=s("copy",Xt);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const eo=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],Wa=s("download",eo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const to=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]],Ua=s("external-link",to);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const oo=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],Ya=s("eye-off",oo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ro=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Za=s("eye",ro);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ao=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],Ka=s("file-text",ao);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const no=[["path",{d:"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",key:"1jaruq"}]],Ja=s("flag",no);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const so=[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]],Qa=s("folder-open",so);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const co=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M16 16s-1.5-2-4-2-4 2-4 2",key:"epbg0q"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9",key:"yxxnd0"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9",key:"1p4y9e"}]],Xa=s("frown",co);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const io=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],en=s("funnel",io);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lo=[["path",{d:"M15 6a9 9 0 0 0-9 9V3",key:"1cii5b"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}]],tn=s("git-branch",lo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ho=[["circle",{cx:"18",cy:"18",r:"3",key:"1xkwt0"}],["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M6 21V9a9 9 0 0 0 9 9",key:"7kw0sc"}]],on=s("git-merge",ho);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const po=[["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}],["circle",{cx:"9",cy:"5",r:"1",key:"hp0tcf"}],["circle",{cx:"9",cy:"19",r:"1",key:"fkjjf6"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["circle",{cx:"15",cy:"19",r:"1",key:"f4zoj3"}]],rn=s("grip-vertical",po);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yo=[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]],an=s("hash",yo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uo=[["path",{d:"M4 12h8",key:"17cfdx"}],["path",{d:"M4 18V6",key:"1rz3zl"}],["path",{d:"M12 18V6",key:"zqpxq5"}],["path",{d:"M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1",key:"9jr5yi"}]],nn=s("heading-2",uo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mo=[["path",{d:"M6 12h12",key:"8npq4p"}],["path",{d:"M6 20V4",key:"1w1bmo"}],["path",{d:"M18 20V4",key:"o2hl4u"}]],sn=s("heading",mo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fo=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]],cn=s("image",fo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const go=[["line",{x1:"19",x2:"10",y1:"4",y2:"4",key:"15jd3p"}],["line",{x1:"14",x2:"5",y1:"20",y2:"20",key:"bu0au3"}],["line",{x1:"15",x2:"9",y1:"4",y2:"20",key:"uljnxc"}]],ln=s("italic",go);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ko=[["path",{d:"M5 3v14",key:"9nsxs2"}],["path",{d:"M12 3v8",key:"1h2ygw"}],["path",{d:"M19 3v18",key:"1sk56x"}]],dn=s("kanban",ko);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bo=[["path",{d:"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4",key:"g0fldk"}],["path",{d:"m21 2-9.6 9.6",key:"1j0ho8"}],["circle",{cx:"7.5",cy:"15.5",r:"5.5",key:"yqb3hr"}]],hn=s("key",bo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vo=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],pn=s("layers",vo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xo=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],yn=s("layout-dashboard",xo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wo=[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]],un=s("layout-grid",wo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mo=[["rect",{width:"8",height:"18",x:"3",y:"3",rx:"1",key:"oynpb5"}],["path",{d:"M7 3v18",key:"bbkbws"}],["path",{d:"M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z",key:"1qboyk"}]],mn=s("library-big",Mo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _o=[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]],fn=s("lightbulb",_o);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Co=[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]],gn=s("link-2",Co);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=[["path",{d:"M13 5h8",key:"a7qcls"}],["path",{d:"M13 12h8",key:"h98zly"}],["path",{d:"M13 19h8",key:"c3s6r1"}],["path",{d:"m3 17 2 2 4-4",key:"1jhpwq"}],["path",{d:"m3 7 2 2 4-4",key:"1obspn"}]],kn=s("list-checks",zo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const No=[["path",{d:"M11 5h10",key:"1cz7ny"}],["path",{d:"M11 12h10",key:"1438ji"}],["path",{d:"M11 19h10",key:"11t30w"}],["path",{d:"M4 4h1v5",key:"10yrso"}],["path",{d:"M4 9h2",key:"r1h2o0"}],["path",{d:"M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02",key:"xtkcd5"}]],bn=s("list-ordered",No);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $o=[["path",{d:"M3 5h.01",key:"18ugdj"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 19h.01",key:"noohij"}],["path",{d:"M8 5h13",key:"1pao27"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 19h13",key:"m83p4d"}]],vn=s("list",$o);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ao=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],xn=s("loader-circle",Ao);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jo=[["path",{d:"m10 17 5-5-5-5",key:"1bsop3"}],["path",{d:"M15 12H3",key:"6jk70r"}],["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}]],wn=s("log-in",jo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const So=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],Mn=s("log-out",So);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"m21 3-7 7",key:"1l2asr"}],["path",{d:"m3 21 7-7",key:"tjx5ai"}],["path",{d:"M9 21H3v-6",key:"wtvkvv"}]],_n=s("maximize-2",Io);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"8",x2:"16",y1:"15",y2:"15",key:"1xb1d9"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9",key:"yxxnd0"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9",key:"1p4y9e"}]],Cn=s("meh",Lo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Po=[["path",{d:"M5 12h14",key:"1ays0h"}]],zn=s("minus",Po);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const To=[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]],Nn=s("monitor",To);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ro=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],$n=s("moon",Ro);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fo=[["path",{d:"M14 4.1 12 6",key:"ita8i4"}],["path",{d:"m5.1 8-2.9-.8",key:"1go3kf"}],["path",{d:"m6 12-1.9 2",key:"mnht97"}],["path",{d:"M7.2 2.2 8 5.1",key:"1cfko1"}],["path",{d:"M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z",key:"s0h3yz"}]],An=s("mouse-pointer-click",Fo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qo=[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1",key:"4q2zg0"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1",key:"8cvhb9"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1",key:"1egb70"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",key:"1jsf9p"}],["path",{d:"M12 12V8",key:"2874zd"}]],jn=s("network",qo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Oo=[["path",{d:"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",key:"e79jfc"}],["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}]],Sn=s("palette",Oo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=[["path",{d:"M13 21h8",key:"1jsn5i"}],["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],In=s("pen-line",Vo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Eo=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],Ln=s("pen",Eo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=[["path",{d:"M12 17v5",key:"bb1du9"}],["path",{d:"M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89",key:"znwnzq"}],["path",{d:"m2 2 20 20",key:"1ooewy"}],["path",{d:"M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11",key:"c9qhm2"}]],Pn=s("pin-off",Ho);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bo=[["path",{d:"M12 17v5",key:"bb1du9"}],["path",{d:"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",key:"1nkz8b"}]],Tn=s("pin",Bo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Do=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],Rn=s("plus",Do);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Go=[["path",{d:"M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",key:"rib7q0"}],["path",{d:"M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z",key:"1ymkrd"}]],Fn=s("quote",Go);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wo=[["path",{d:"m15 14 5-5-5-5",key:"12vg1m"}],["path",{d:"M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13",key:"6uklza"}]],qn=s("redo-2",Wo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uo=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],On=s("refresh-cw",Uo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yo=[["path",{d:"m17 2 4 4-4 4",key:"nntrym"}],["path",{d:"M3 11v-1a4 4 0 0 1 4-4h14",key:"84bu3i"}],["path",{d:"m7 22-4-4 4-4",key:"1wqhfi"}],["path",{d:"M21 13v1a4 4 0 0 1-4 4H3",key:"1rx37r"}]],Vn=s("repeat",Yo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zo=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]],En=s("rotate-ccw",Zo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ko=[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]],Hn=s("save",Ko);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jo=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],Bn=s("search",Jo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qo=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Dn=s("settings",Qo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xo=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],Gn=s("shield",Xo);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const er=[["path",{d:"M10 5H3",key:"1qgfaw"}],["path",{d:"M12 19H3",key:"yhmn1j"}],["path",{d:"M14 3v4",key:"1sua03"}],["path",{d:"M16 17v4",key:"1q0r14"}],["path",{d:"M21 12h-9",key:"1o4lsq"}],["path",{d:"M21 19h-5",key:"1rlt1p"}],["path",{d:"M21 5h-7",key:"1oszz2"}],["path",{d:"M8 10v4",key:"tgpxqk"}],["path",{d:"M8 12H3",key:"a7s4jb"}]],Wn=s("sliders-horizontal",er);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tr=[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]],Un=s("smartphone",tr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const or=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2",key:"1y1vjs"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9",key:"yxxnd0"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9",key:"1p4y9e"}]],Yn=s("smile",or);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rr=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],Zn=s("sparkles",rr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ar=[["path",{d:"M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344",key:"2acyp4"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],Kn=s("square-check-big",ar);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nr=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],Jn=s("square-check",nr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sr=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]],Qn=s("square",sr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cr=[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]],Xn=s("star",cr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ir=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],es=s("sun",ir);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lr=[["path",{d:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",key:"gugj83"}]],ts=s("table-2",lr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dr=[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]],os=s("tag",dr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hr=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]],rs=s("target",hr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pr=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],as=s("trash-2",pr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yr=[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]],ns=s("trending-up",yr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ur=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],ss=s("triangle-alert",ur);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mr=[["path",{d:"M12 4v16",key:"1654pz"}],["path",{d:"M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2",key:"e0r10z"}],["path",{d:"M9 20h6",key:"s66wpe"}]],cs=s("type",mr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fr=[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]],is=s("undo-2",fr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gr=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],ls=s("user-plus",gr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kr=[["circle",{cx:"10",cy:"7",r:"4",key:"e45bow"}],["path",{d:"M10.3 15H7a4 4 0 0 0-4 4v2",key:"3bnktk"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["path",{d:"m21 21-1.9-1.9",key:"1g2n9r"}]],ds=s("user-search",kr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const br=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],hs=s("users",br);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vr=[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]],ps=s("wand-sparkles",vr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xr=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],ys=s("x",xr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wr=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],us=s("zap",wr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mr=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14",key:"1vmskp"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11",key:"durymu"}]],ms=s("zoom-in",Mr);/**
 * @license lucide-react v0.575.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _r=[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11",key:"durymu"}]],fs=s("zoom-out",_r),Oe=Symbol.for("constructDateFrom");function Ze(e,r){return typeof e=="function"?e(r):e&&typeof e=="object"&&Oe in e?e[Oe](r):e instanceof Date?new e.constructor(r):new Date(r)}function fe(e,r){return Ze(e,e)}function Me(e,...r){const a=Ze.bind(null,r.find(n=>typeof n=="object"));return r.map(a)}function me(e,r){const a=+fe(e)-+fe(r);return a<0?-1:a>0?1:a}function Cr(e,r,a){const[n,c]=Me(a==null?void 0:a.in,e,r),l=n.getFullYear()-c.getFullYear(),i=n.getMonth()-c.getMonth();return l*12+i}function zr(e,r,a){const[n,c]=Me(a==null?void 0:a.in,e,r);return n.getFullYear()-c.getFullYear()}function Nr(e,r){const a=fe(e);return a.setHours(23,59,59,999),a}function $r(e,r){const a=fe(e),n=a.getMonth();return a.setFullYear(a.getFullYear(),n+1,0),a.setHours(23,59,59,999),a}function Ar(e,r){const a=fe(e);return+Nr(a)==+$r(a)}function gs(e,r,a){const[n,c,l]=Me(a==null?void 0:a.in,e,e,r),i=me(c,l),h=Math.abs(Cr(c,l));if(h<1)return 0;c.getMonth()===1&&c.getDate()>27&&c.setDate(30),c.setMonth(c.getMonth()-i*h);let d=me(c,l)===-i;Ar(n)&&h===1&&me(n,l)===1&&(d=!1);const b=i*(h-+d);return b===0?0:b}function ks(e,r,a){const[n,c]=Me(a==null?void 0:a.in,e,r),l=me(n,c),i=Math.abs(zr(n,c));n.setFullYear(1584),c.setFullYear(1584);const h=me(n,c)===-l,d=l*(i-+h);return d===0?0:d}function Ke(e){var r,a,n="";if(typeof e=="string"||typeof e=="number")n+=e;else if(typeof e=="object")if(Array.isArray(e)){var c=e.length;for(r=0;r<c;r++)e[r]&&(a=Ke(e[r]))&&(n&&(n+=" "),n+=a)}else for(a in e)e[a]&&(n&&(n+=" "),n+=a);return n}function bs(){for(var e,r,a=0,n="",c=arguments.length;a<c;a++)(e=arguments[a])&&(r=Ke(e))&&(n&&(n+=" "),n+=r);return n}const jr=(e,r)=>{const a=new Array(e.length+r.length);for(let n=0;n<e.length;n++)a[n]=e[n];for(let n=0;n<r.length;n++)a[e.length+n]=r[n];return a},Sr=(e,r)=>({classGroupId:e,validator:r}),Je=(e=new Map,r=null,a)=>({nextPart:e,validators:r,classGroupId:a}),we="-",Ve=[],Ir="arbitrary..",Lr=e=>{const r=Tr(e),{conflictingClassGroups:a,conflictingClassGroupModifiers:n}=e;return{getClassGroupId:i=>{if(i.startsWith("[")&&i.endsWith("]"))return Pr(i);const h=i.split(we),d=h[0]===""&&h.length>1?1:0;return Qe(h,d,r)},getConflictingClassGroupIds:(i,h)=>{if(h){const d=n[i],b=a[i];return d?b?jr(b,d):d:b||Ve}return a[i]||Ve}}},Qe=(e,r,a)=>{if(e.length-r===0)return a.classGroupId;const c=e[r],l=a.nextPart.get(c);if(l){const b=Qe(e,r+1,l);if(b)return b}const i=a.validators;if(i===null)return;const h=r===0?e.join(we):e.slice(r).join(we),d=i.length;for(let b=0;b<d;b++){const z=i[b];if(z.validator(h))return z.classGroupId}},Pr=e=>e.slice(1,-1).indexOf(":")===-1?void 0:(()=>{const r=e.slice(1,-1),a=r.indexOf(":"),n=r.slice(0,a);return n?Ir+n:void 0})(),Tr=e=>{const{theme:r,classGroups:a}=e;return Rr(a,r)},Rr=(e,r)=>{const a=Je();for(const n in e){const c=e[n];je(c,a,n,r)}return a},je=(e,r,a,n)=>{const c=e.length;for(let l=0;l<c;l++){const i=e[l];Fr(i,r,a,n)}},Fr=(e,r,a,n)=>{if(typeof e=="string"){qr(e,r,a);return}if(typeof e=="function"){Or(e,r,a,n);return}Vr(e,r,a,n)},qr=(e,r,a)=>{const n=e===""?r:Xe(r,e);n.classGroupId=a},Or=(e,r,a,n)=>{if(Er(e)){je(e(n),r,a,n);return}r.validators===null&&(r.validators=[]),r.validators.push(Sr(a,e))},Vr=(e,r,a,n)=>{const c=Object.entries(e),l=c.length;for(let i=0;i<l;i++){const[h,d]=c[i];je(d,Xe(r,h),a,n)}},Xe=(e,r)=>{let a=e;const n=r.split(we),c=n.length;for(let l=0;l<c;l++){const i=n[l];let h=a.nextPart.get(i);h||(h=Je(),a.nextPart.set(i,h)),a=h}return a},Er=e=>"isThemeGetter"in e&&e.isThemeGetter===!0,Hr=e=>{if(e<1)return{get:()=>{},set:()=>{}};let r=0,a=Object.create(null),n=Object.create(null);const c=(l,i)=>{a[l]=i,r++,r>e&&(r=0,n=a,a=Object.create(null))};return{get(l){let i=a[l];if(i!==void 0)return i;if((i=n[l])!==void 0)return c(l,i),i},set(l,i){l in a?a[l]=i:c(l,i)}}},$e="!",Ee=":",Br=[],He=(e,r,a,n,c)=>({modifiers:e,hasImportantModifier:r,baseClassName:a,maybePostfixModifierPosition:n,isExternal:c}),Dr=e=>{const{prefix:r,experimentalParseClassName:a}=e;let n=c=>{const l=[];let i=0,h=0,d=0,b;const z=c.length;for(let q=0;q<z;q++){const N=c[q];if(i===0&&h===0){if(N===Ee){l.push(c.slice(d,q)),d=q+1;continue}if(N==="/"){b=q;continue}}N==="["?i++:N==="]"?i--:N==="("?h++:N===")"&&h--}const S=l.length===0?c:c.slice(d);let L=S,B=!1;S.endsWith($e)?(L=S.slice(0,-1),B=!0):S.startsWith($e)&&(L=S.slice(1),B=!0);const D=b&&b>d?b-d:void 0;return He(l,B,L,D)};if(r){const c=r+Ee,l=n;n=i=>i.startsWith(c)?l(i.slice(c.length)):He(Br,!1,i,void 0,!0)}if(a){const c=n;n=l=>a({className:l,parseClassName:c})}return n},Gr=e=>{const r=new Map;return e.orderSensitiveModifiers.forEach((a,n)=>{r.set(a,1e6+n)}),a=>{const n=[];let c=[];for(let l=0;l<a.length;l++){const i=a[l],h=i[0]==="[",d=r.has(i);h||d?(c.length>0&&(c.sort(),n.push(...c),c=[]),n.push(i)):c.push(i)}return c.length>0&&(c.sort(),n.push(...c)),n}},Wr=e=>({cache:Hr(e.cacheSize),parseClassName:Dr(e),sortModifiers:Gr(e),...Lr(e)}),Ur=/\s+/,Yr=(e,r)=>{const{parseClassName:a,getClassGroupId:n,getConflictingClassGroupIds:c,sortModifiers:l}=r,i=[],h=e.trim().split(Ur);let d="";for(let b=h.length-1;b>=0;b-=1){const z=h[b],{isExternal:S,modifiers:L,hasImportantModifier:B,baseClassName:D,maybePostfixModifierPosition:q}=a(z);if(S){d=z+(d.length>0?" "+d:d);continue}let N=!!q,G=n(N?D.substring(0,q):D);if(!G){if(!N){d=z+(d.length>0?" "+d:d);continue}if(G=n(D),!G){d=z+(d.length>0?" "+d:d);continue}N=!1}const ie=L.length===0?"":L.length===1?L[0]:l(L).join(":"),W=B?ie+$e:ie,Q=W+G;if(i.indexOf(Q)>-1)continue;i.push(Q);const X=c(G,N);for(let U=0;U<X.length;++U){const ae=X[U];i.push(W+ae)}d=z+(d.length>0?" "+d:d)}return d},Zr=(...e)=>{let r=0,a,n,c="";for(;r<e.length;)(a=e[r++])&&(n=et(a))&&(c&&(c+=" "),c+=n);return c},et=e=>{if(typeof e=="string")return e;let r,a="";for(let n=0;n<e.length;n++)e[n]&&(r=et(e[n]))&&(a&&(a+=" "),a+=r);return a},Kr=(e,...r)=>{let a,n,c,l;const i=d=>{const b=r.reduce((z,S)=>S(z),e());return a=Wr(b),n=a.cache.get,c=a.cache.set,l=h,h(d)},h=d=>{const b=n(d);if(b)return b;const z=Yr(d,a);return c(d,z),z};return l=i,(...d)=>l(Zr(...d))},Jr=[],P=e=>{const r=a=>a[e]||Jr;return r.isThemeGetter=!0,r},tt=/^\[(?:(\w[\w-]*):)?(.+)\]$/i,ot=/^\((?:(\w[\w-]*):)?(.+)\)$/i,Qr=/^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/,Xr=/^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/,ea=/\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/,ta=/^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/,oa=/^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/,ra=/^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/,ee=e=>Qr.test(e),_=e=>!!e&&!Number.isNaN(Number(e)),te=e=>!!e&&Number.isInteger(Number(e)),Ce=e=>e.endsWith("%")&&_(e.slice(0,-1)),J=e=>Xr.test(e),rt=()=>!0,aa=e=>ea.test(e)&&!ta.test(e),Se=()=>!1,na=e=>oa.test(e),sa=e=>ra.test(e),ca=e=>!p(e)&&!y(e),ia=e=>re(e,st,Se),p=e=>tt.test(e),se=e=>re(e,ct,aa),Be=e=>re(e,fa,_),la=e=>re(e,lt,rt),da=e=>re(e,it,Se),De=e=>re(e,at,Se),ha=e=>re(e,nt,sa),ve=e=>re(e,dt,na),y=e=>ot.test(e),ye=e=>ce(e,ct),pa=e=>ce(e,it),Ge=e=>ce(e,at),ya=e=>ce(e,st),ua=e=>ce(e,nt),xe=e=>ce(e,dt,!0),ma=e=>ce(e,lt,!0),re=(e,r,a)=>{const n=tt.exec(e);return n?n[1]?r(n[1]):a(n[2]):!1},ce=(e,r,a=!1)=>{const n=ot.exec(e);return n?n[1]?r(n[1]):a:!1},at=e=>e==="position"||e==="percentage",nt=e=>e==="image"||e==="url",st=e=>e==="length"||e==="size"||e==="bg-size",ct=e=>e==="length",fa=e=>e==="number",it=e=>e==="family-name",lt=e=>e==="number"||e==="weight",dt=e=>e==="shadow",ga=()=>{const e=P("color"),r=P("font"),a=P("text"),n=P("font-weight"),c=P("tracking"),l=P("leading"),i=P("breakpoint"),h=P("container"),d=P("spacing"),b=P("radius"),z=P("shadow"),S=P("inset-shadow"),L=P("text-shadow"),B=P("drop-shadow"),D=P("blur"),q=P("perspective"),N=P("aspect"),G=P("ease"),ie=P("animate"),W=()=>["auto","avoid","all","avoid-page","page","left","right","column"],Q=()=>["center","top","bottom","left","right","top-left","left-top","top-right","right-top","bottom-right","right-bottom","bottom-left","left-bottom"],X=()=>[...Q(),y,p],U=()=>["auto","hidden","clip","visible","scroll"],ae=()=>["auto","contain","none"],f=()=>[y,p,d],T=()=>[ee,"full","auto",...f()],ge=()=>[te,"none","subgrid",y,p],ke=()=>["auto",{span:["full",te,y,p]},te,y,p],le=()=>[te,"auto",y,p],be=()=>["auto","min","max","fr",y,p],de=()=>["start","end","center","between","around","evenly","stretch","baseline","center-safe","end-safe"],E=()=>["start","end","center","stretch","center-safe","end-safe"],R=()=>["auto",...f()],Y=()=>[ee,"auto","full","dvw","dvh","lvw","lvh","svw","svh","min","max","fit",...f()],he=()=>[ee,"screen","full","dvw","lvw","svw","min","max","fit",...f()],pe=()=>[ee,"screen","full","lh","dvh","lvh","svh","min","max","fit",...f()],t=()=>[e,y,p],o=()=>[...Q(),Ge,De,{position:[y,p]}],u=()=>["no-repeat",{repeat:["","x","y","space","round"]}],v=()=>["auto","cover","contain",ya,ia,{size:[y,p]}],w=()=>[Ce,ye,se],m=()=>["","none","full",b,y,p],g=()=>["",_,ye,se],k=()=>["solid","dashed","dotted","double"],M=()=>["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity"],x=()=>[_,Ce,Ge,De],j=()=>["","none",D,y,p],$=()=>["none",_,y,p],A=()=>["none",_,y,p],I=()=>[_,y,p],C=()=>[ee,"full",...f()];return{cacheSize:500,theme:{animate:["spin","ping","pulse","bounce"],aspect:["video"],blur:[J],breakpoint:[J],color:[rt],container:[J],"drop-shadow":[J],ease:["in","out","in-out"],font:[ca],"font-weight":["thin","extralight","light","normal","medium","semibold","bold","extrabold","black"],"inset-shadow":[J],leading:["none","tight","snug","normal","relaxed","loose"],perspective:["dramatic","near","normal","midrange","distant","none"],radius:[J],shadow:[J],spacing:["px",_],text:[J],"text-shadow":[J],tracking:["tighter","tight","normal","wide","wider","widest"]},classGroups:{aspect:[{aspect:["auto","square",ee,p,y,N]}],container:["container"],columns:[{columns:[_,p,y,h]}],"break-after":[{"break-after":W()}],"break-before":[{"break-before":W()}],"break-inside":[{"break-inside":["auto","avoid","avoid-page","avoid-column"]}],"box-decoration":[{"box-decoration":["slice","clone"]}],box:[{box:["border","content"]}],display:["block","inline-block","inline","flex","inline-flex","table","inline-table","table-caption","table-cell","table-column","table-column-group","table-footer-group","table-header-group","table-row-group","table-row","flow-root","grid","inline-grid","contents","list-item","hidden"],sr:["sr-only","not-sr-only"],float:[{float:["right","left","none","start","end"]}],clear:[{clear:["left","right","both","none","start","end"]}],isolation:["isolate","isolation-auto"],"object-fit":[{object:["contain","cover","fill","none","scale-down"]}],"object-position":[{object:X()}],overflow:[{overflow:U()}],"overflow-x":[{"overflow-x":U()}],"overflow-y":[{"overflow-y":U()}],overscroll:[{overscroll:ae()}],"overscroll-x":[{"overscroll-x":ae()}],"overscroll-y":[{"overscroll-y":ae()}],position:["static","fixed","absolute","relative","sticky"],inset:[{inset:T()}],"inset-x":[{"inset-x":T()}],"inset-y":[{"inset-y":T()}],start:[{"inset-s":T(),start:T()}],end:[{"inset-e":T(),end:T()}],"inset-bs":[{"inset-bs":T()}],"inset-be":[{"inset-be":T()}],top:[{top:T()}],right:[{right:T()}],bottom:[{bottom:T()}],left:[{left:T()}],visibility:["visible","invisible","collapse"],z:[{z:[te,"auto",y,p]}],basis:[{basis:[ee,"full","auto",h,...f()]}],"flex-direction":[{flex:["row","row-reverse","col","col-reverse"]}],"flex-wrap":[{flex:["nowrap","wrap","wrap-reverse"]}],flex:[{flex:[_,ee,"auto","initial","none",p]}],grow:[{grow:["",_,y,p]}],shrink:[{shrink:["",_,y,p]}],order:[{order:[te,"first","last","none",y,p]}],"grid-cols":[{"grid-cols":ge()}],"col-start-end":[{col:ke()}],"col-start":[{"col-start":le()}],"col-end":[{"col-end":le()}],"grid-rows":[{"grid-rows":ge()}],"row-start-end":[{row:ke()}],"row-start":[{"row-start":le()}],"row-end":[{"row-end":le()}],"grid-flow":[{"grid-flow":["row","col","dense","row-dense","col-dense"]}],"auto-cols":[{"auto-cols":be()}],"auto-rows":[{"auto-rows":be()}],gap:[{gap:f()}],"gap-x":[{"gap-x":f()}],"gap-y":[{"gap-y":f()}],"justify-content":[{justify:[...de(),"normal"]}],"justify-items":[{"justify-items":[...E(),"normal"]}],"justify-self":[{"justify-self":["auto",...E()]}],"align-content":[{content:["normal",...de()]}],"align-items":[{items:[...E(),{baseline:["","last"]}]}],"align-self":[{self:["auto",...E(),{baseline:["","last"]}]}],"place-content":[{"place-content":de()}],"place-items":[{"place-items":[...E(),"baseline"]}],"place-self":[{"place-self":["auto",...E()]}],p:[{p:f()}],px:[{px:f()}],py:[{py:f()}],ps:[{ps:f()}],pe:[{pe:f()}],pbs:[{pbs:f()}],pbe:[{pbe:f()}],pt:[{pt:f()}],pr:[{pr:f()}],pb:[{pb:f()}],pl:[{pl:f()}],m:[{m:R()}],mx:[{mx:R()}],my:[{my:R()}],ms:[{ms:R()}],me:[{me:R()}],mbs:[{mbs:R()}],mbe:[{mbe:R()}],mt:[{mt:R()}],mr:[{mr:R()}],mb:[{mb:R()}],ml:[{ml:R()}],"space-x":[{"space-x":f()}],"space-x-reverse":["space-x-reverse"],"space-y":[{"space-y":f()}],"space-y-reverse":["space-y-reverse"],size:[{size:Y()}],"inline-size":[{inline:["auto",...he()]}],"min-inline-size":[{"min-inline":["auto",...he()]}],"max-inline-size":[{"max-inline":["none",...he()]}],"block-size":[{block:["auto",...pe()]}],"min-block-size":[{"min-block":["auto",...pe()]}],"max-block-size":[{"max-block":["none",...pe()]}],w:[{w:[h,"screen",...Y()]}],"min-w":[{"min-w":[h,"screen","none",...Y()]}],"max-w":[{"max-w":[h,"screen","none","prose",{screen:[i]},...Y()]}],h:[{h:["screen","lh",...Y()]}],"min-h":[{"min-h":["screen","lh","none",...Y()]}],"max-h":[{"max-h":["screen","lh",...Y()]}],"font-size":[{text:["base",a,ye,se]}],"font-smoothing":["antialiased","subpixel-antialiased"],"font-style":["italic","not-italic"],"font-weight":[{font:[n,ma,la]}],"font-stretch":[{"font-stretch":["ultra-condensed","extra-condensed","condensed","semi-condensed","normal","semi-expanded","expanded","extra-expanded","ultra-expanded",Ce,p]}],"font-family":[{font:[pa,da,r]}],"font-features":[{"font-features":[p]}],"fvn-normal":["normal-nums"],"fvn-ordinal":["ordinal"],"fvn-slashed-zero":["slashed-zero"],"fvn-figure":["lining-nums","oldstyle-nums"],"fvn-spacing":["proportional-nums","tabular-nums"],"fvn-fraction":["diagonal-fractions","stacked-fractions"],tracking:[{tracking:[c,y,p]}],"line-clamp":[{"line-clamp":[_,"none",y,Be]}],leading:[{leading:[l,...f()]}],"list-image":[{"list-image":["none",y,p]}],"list-style-position":[{list:["inside","outside"]}],"list-style-type":[{list:["disc","decimal","none",y,p]}],"text-alignment":[{text:["left","center","right","justify","start","end"]}],"placeholder-color":[{placeholder:t()}],"text-color":[{text:t()}],"text-decoration":["underline","overline","line-through","no-underline"],"text-decoration-style":[{decoration:[...k(),"wavy"]}],"text-decoration-thickness":[{decoration:[_,"from-font","auto",y,se]}],"text-decoration-color":[{decoration:t()}],"underline-offset":[{"underline-offset":[_,"auto",y,p]}],"text-transform":["uppercase","lowercase","capitalize","normal-case"],"text-overflow":["truncate","text-ellipsis","text-clip"],"text-wrap":[{text:["wrap","nowrap","balance","pretty"]}],indent:[{indent:f()}],"vertical-align":[{align:["baseline","top","middle","bottom","text-top","text-bottom","sub","super",y,p]}],whitespace:[{whitespace:["normal","nowrap","pre","pre-line","pre-wrap","break-spaces"]}],break:[{break:["normal","words","all","keep"]}],wrap:[{wrap:["break-word","anywhere","normal"]}],hyphens:[{hyphens:["none","manual","auto"]}],content:[{content:["none",y,p]}],"bg-attachment":[{bg:["fixed","local","scroll"]}],"bg-clip":[{"bg-clip":["border","padding","content","text"]}],"bg-origin":[{"bg-origin":["border","padding","content"]}],"bg-position":[{bg:o()}],"bg-repeat":[{bg:u()}],"bg-size":[{bg:v()}],"bg-image":[{bg:["none",{linear:[{to:["t","tr","r","br","b","bl","l","tl"]},te,y,p],radial:["",y,p],conic:[te,y,p]},ua,ha]}],"bg-color":[{bg:t()}],"gradient-from-pos":[{from:w()}],"gradient-via-pos":[{via:w()}],"gradient-to-pos":[{to:w()}],"gradient-from":[{from:t()}],"gradient-via":[{via:t()}],"gradient-to":[{to:t()}],rounded:[{rounded:m()}],"rounded-s":[{"rounded-s":m()}],"rounded-e":[{"rounded-e":m()}],"rounded-t":[{"rounded-t":m()}],"rounded-r":[{"rounded-r":m()}],"rounded-b":[{"rounded-b":m()}],"rounded-l":[{"rounded-l":m()}],"rounded-ss":[{"rounded-ss":m()}],"rounded-se":[{"rounded-se":m()}],"rounded-ee":[{"rounded-ee":m()}],"rounded-es":[{"rounded-es":m()}],"rounded-tl":[{"rounded-tl":m()}],"rounded-tr":[{"rounded-tr":m()}],"rounded-br":[{"rounded-br":m()}],"rounded-bl":[{"rounded-bl":m()}],"border-w":[{border:g()}],"border-w-x":[{"border-x":g()}],"border-w-y":[{"border-y":g()}],"border-w-s":[{"border-s":g()}],"border-w-e":[{"border-e":g()}],"border-w-bs":[{"border-bs":g()}],"border-w-be":[{"border-be":g()}],"border-w-t":[{"border-t":g()}],"border-w-r":[{"border-r":g()}],"border-w-b":[{"border-b":g()}],"border-w-l":[{"border-l":g()}],"divide-x":[{"divide-x":g()}],"divide-x-reverse":["divide-x-reverse"],"divide-y":[{"divide-y":g()}],"divide-y-reverse":["divide-y-reverse"],"border-style":[{border:[...k(),"hidden","none"]}],"divide-style":[{divide:[...k(),"hidden","none"]}],"border-color":[{border:t()}],"border-color-x":[{"border-x":t()}],"border-color-y":[{"border-y":t()}],"border-color-s":[{"border-s":t()}],"border-color-e":[{"border-e":t()}],"border-color-bs":[{"border-bs":t()}],"border-color-be":[{"border-be":t()}],"border-color-t":[{"border-t":t()}],"border-color-r":[{"border-r":t()}],"border-color-b":[{"border-b":t()}],"border-color-l":[{"border-l":t()}],"divide-color":[{divide:t()}],"outline-style":[{outline:[...k(),"none","hidden"]}],"outline-offset":[{"outline-offset":[_,y,p]}],"outline-w":[{outline:["",_,ye,se]}],"outline-color":[{outline:t()}],shadow:[{shadow:["","none",z,xe,ve]}],"shadow-color":[{shadow:t()}],"inset-shadow":[{"inset-shadow":["none",S,xe,ve]}],"inset-shadow-color":[{"inset-shadow":t()}],"ring-w":[{ring:g()}],"ring-w-inset":["ring-inset"],"ring-color":[{ring:t()}],"ring-offset-w":[{"ring-offset":[_,se]}],"ring-offset-color":[{"ring-offset":t()}],"inset-ring-w":[{"inset-ring":g()}],"inset-ring-color":[{"inset-ring":t()}],"text-shadow":[{"text-shadow":["none",L,xe,ve]}],"text-shadow-color":[{"text-shadow":t()}],opacity:[{opacity:[_,y,p]}],"mix-blend":[{"mix-blend":[...M(),"plus-darker","plus-lighter"]}],"bg-blend":[{"bg-blend":M()}],"mask-clip":[{"mask-clip":["border","padding","content","fill","stroke","view"]},"mask-no-clip"],"mask-composite":[{mask:["add","subtract","intersect","exclude"]}],"mask-image-linear-pos":[{"mask-linear":[_]}],"mask-image-linear-from-pos":[{"mask-linear-from":x()}],"mask-image-linear-to-pos":[{"mask-linear-to":x()}],"mask-image-linear-from-color":[{"mask-linear-from":t()}],"mask-image-linear-to-color":[{"mask-linear-to":t()}],"mask-image-t-from-pos":[{"mask-t-from":x()}],"mask-image-t-to-pos":[{"mask-t-to":x()}],"mask-image-t-from-color":[{"mask-t-from":t()}],"mask-image-t-to-color":[{"mask-t-to":t()}],"mask-image-r-from-pos":[{"mask-r-from":x()}],"mask-image-r-to-pos":[{"mask-r-to":x()}],"mask-image-r-from-color":[{"mask-r-from":t()}],"mask-image-r-to-color":[{"mask-r-to":t()}],"mask-image-b-from-pos":[{"mask-b-from":x()}],"mask-image-b-to-pos":[{"mask-b-to":x()}],"mask-image-b-from-color":[{"mask-b-from":t()}],"mask-image-b-to-color":[{"mask-b-to":t()}],"mask-image-l-from-pos":[{"mask-l-from":x()}],"mask-image-l-to-pos":[{"mask-l-to":x()}],"mask-image-l-from-color":[{"mask-l-from":t()}],"mask-image-l-to-color":[{"mask-l-to":t()}],"mask-image-x-from-pos":[{"mask-x-from":x()}],"mask-image-x-to-pos":[{"mask-x-to":x()}],"mask-image-x-from-color":[{"mask-x-from":t()}],"mask-image-x-to-color":[{"mask-x-to":t()}],"mask-image-y-from-pos":[{"mask-y-from":x()}],"mask-image-y-to-pos":[{"mask-y-to":x()}],"mask-image-y-from-color":[{"mask-y-from":t()}],"mask-image-y-to-color":[{"mask-y-to":t()}],"mask-image-radial":[{"mask-radial":[y,p]}],"mask-image-radial-from-pos":[{"mask-radial-from":x()}],"mask-image-radial-to-pos":[{"mask-radial-to":x()}],"mask-image-radial-from-color":[{"mask-radial-from":t()}],"mask-image-radial-to-color":[{"mask-radial-to":t()}],"mask-image-radial-shape":[{"mask-radial":["circle","ellipse"]}],"mask-image-radial-size":[{"mask-radial":[{closest:["side","corner"],farthest:["side","corner"]}]}],"mask-image-radial-pos":[{"mask-radial-at":Q()}],"mask-image-conic-pos":[{"mask-conic":[_]}],"mask-image-conic-from-pos":[{"mask-conic-from":x()}],"mask-image-conic-to-pos":[{"mask-conic-to":x()}],"mask-image-conic-from-color":[{"mask-conic-from":t()}],"mask-image-conic-to-color":[{"mask-conic-to":t()}],"mask-mode":[{mask:["alpha","luminance","match"]}],"mask-origin":[{"mask-origin":["border","padding","content","fill","stroke","view"]}],"mask-position":[{mask:o()}],"mask-repeat":[{mask:u()}],"mask-size":[{mask:v()}],"mask-type":[{"mask-type":["alpha","luminance"]}],"mask-image":[{mask:["none",y,p]}],filter:[{filter:["","none",y,p]}],blur:[{blur:j()}],brightness:[{brightness:[_,y,p]}],contrast:[{contrast:[_,y,p]}],"drop-shadow":[{"drop-shadow":["","none",B,xe,ve]}],"drop-shadow-color":[{"drop-shadow":t()}],grayscale:[{grayscale:["",_,y,p]}],"hue-rotate":[{"hue-rotate":[_,y,p]}],invert:[{invert:["",_,y,p]}],saturate:[{saturate:[_,y,p]}],sepia:[{sepia:["",_,y,p]}],"backdrop-filter":[{"backdrop-filter":["","none",y,p]}],"backdrop-blur":[{"backdrop-blur":j()}],"backdrop-brightness":[{"backdrop-brightness":[_,y,p]}],"backdrop-contrast":[{"backdrop-contrast":[_,y,p]}],"backdrop-grayscale":[{"backdrop-grayscale":["",_,y,p]}],"backdrop-hue-rotate":[{"backdrop-hue-rotate":[_,y,p]}],"backdrop-invert":[{"backdrop-invert":["",_,y,p]}],"backdrop-opacity":[{"backdrop-opacity":[_,y,p]}],"backdrop-saturate":[{"backdrop-saturate":[_,y,p]}],"backdrop-sepia":[{"backdrop-sepia":["",_,y,p]}],"border-collapse":[{border:["collapse","separate"]}],"border-spacing":[{"border-spacing":f()}],"border-spacing-x":[{"border-spacing-x":f()}],"border-spacing-y":[{"border-spacing-y":f()}],"table-layout":[{table:["auto","fixed"]}],caption:[{caption:["top","bottom"]}],transition:[{transition:["","all","colors","opacity","shadow","transform","none",y,p]}],"transition-behavior":[{transition:["normal","discrete"]}],duration:[{duration:[_,"initial",y,p]}],ease:[{ease:["linear","initial",G,y,p]}],delay:[{delay:[_,y,p]}],animate:[{animate:["none",ie,y,p]}],backface:[{backface:["hidden","visible"]}],perspective:[{perspective:[q,y,p]}],"perspective-origin":[{"perspective-origin":X()}],rotate:[{rotate:$()}],"rotate-x":[{"rotate-x":$()}],"rotate-y":[{"rotate-y":$()}],"rotate-z":[{"rotate-z":$()}],scale:[{scale:A()}],"scale-x":[{"scale-x":A()}],"scale-y":[{"scale-y":A()}],"scale-z":[{"scale-z":A()}],"scale-3d":["scale-3d"],skew:[{skew:I()}],"skew-x":[{"skew-x":I()}],"skew-y":[{"skew-y":I()}],transform:[{transform:[y,p,"","none","gpu","cpu"]}],"transform-origin":[{origin:X()}],"transform-style":[{transform:["3d","flat"]}],translate:[{translate:C()}],"translate-x":[{"translate-x":C()}],"translate-y":[{"translate-y":C()}],"translate-z":[{"translate-z":C()}],"translate-none":["translate-none"],accent:[{accent:t()}],appearance:[{appearance:["none","auto"]}],"caret-color":[{caret:t()}],"color-scheme":[{scheme:["normal","dark","light","light-dark","only-dark","only-light"]}],cursor:[{cursor:["auto","default","pointer","wait","text","move","help","not-allowed","none","context-menu","progress","cell","crosshair","vertical-text","alias","copy","no-drop","grab","grabbing","all-scroll","col-resize","row-resize","n-resize","e-resize","s-resize","w-resize","ne-resize","nw-resize","se-resize","sw-resize","ew-resize","ns-resize","nesw-resize","nwse-resize","zoom-in","zoom-out",y,p]}],"field-sizing":[{"field-sizing":["fixed","content"]}],"pointer-events":[{"pointer-events":["auto","none"]}],resize:[{resize:["none","","y","x"]}],"scroll-behavior":[{scroll:["auto","smooth"]}],"scroll-m":[{"scroll-m":f()}],"scroll-mx":[{"scroll-mx":f()}],"scroll-my":[{"scroll-my":f()}],"scroll-ms":[{"scroll-ms":f()}],"scroll-me":[{"scroll-me":f()}],"scroll-mbs":[{"scroll-mbs":f()}],"scroll-mbe":[{"scroll-mbe":f()}],"scroll-mt":[{"scroll-mt":f()}],"scroll-mr":[{"scroll-mr":f()}],"scroll-mb":[{"scroll-mb":f()}],"scroll-ml":[{"scroll-ml":f()}],"scroll-p":[{"scroll-p":f()}],"scroll-px":[{"scroll-px":f()}],"scroll-py":[{"scroll-py":f()}],"scroll-ps":[{"scroll-ps":f()}],"scroll-pe":[{"scroll-pe":f()}],"scroll-pbs":[{"scroll-pbs":f()}],"scroll-pbe":[{"scroll-pbe":f()}],"scroll-pt":[{"scroll-pt":f()}],"scroll-pr":[{"scroll-pr":f()}],"scroll-pb":[{"scroll-pb":f()}],"scroll-pl":[{"scroll-pl":f()}],"snap-align":[{snap:["start","end","center","align-none"]}],"snap-stop":[{snap:["normal","always"]}],"snap-type":[{snap:["none","x","y","both"]}],"snap-strictness":[{snap:["mandatory","proximity"]}],touch:[{touch:["auto","none","manipulation"]}],"touch-x":[{"touch-pan":["x","left","right"]}],"touch-y":[{"touch-pan":["y","up","down"]}],"touch-pz":["touch-pinch-zoom"],select:[{select:["none","text","all","auto"]}],"will-change":[{"will-change":["auto","scroll","contents","transform",y,p]}],fill:[{fill:["none",...t()]}],"stroke-w":[{stroke:[_,ye,se,Be]}],stroke:[{stroke:["none",...t()]}],"forced-color-adjust":[{"forced-color-adjust":["auto","none"]}]},conflictingClassGroups:{overflow:["overflow-x","overflow-y"],overscroll:["overscroll-x","overscroll-y"],inset:["inset-x","inset-y","inset-bs","inset-be","start","end","top","right","bottom","left"],"inset-x":["right","left"],"inset-y":["top","bottom"],flex:["basis","grow","shrink"],gap:["gap-x","gap-y"],p:["px","py","ps","pe","pbs","pbe","pt","pr","pb","pl"],px:["pr","pl"],py:["pt","pb"],m:["mx","my","ms","me","mbs","mbe","mt","mr","mb","ml"],mx:["mr","ml"],my:["mt","mb"],size:["w","h"],"font-size":["leading"],"fvn-normal":["fvn-ordinal","fvn-slashed-zero","fvn-figure","fvn-spacing","fvn-fraction"],"fvn-ordinal":["fvn-normal"],"fvn-slashed-zero":["fvn-normal"],"fvn-figure":["fvn-normal"],"fvn-spacing":["fvn-normal"],"fvn-fraction":["fvn-normal"],"line-clamp":["display","overflow"],rounded:["rounded-s","rounded-e","rounded-t","rounded-r","rounded-b","rounded-l","rounded-ss","rounded-se","rounded-ee","rounded-es","rounded-tl","rounded-tr","rounded-br","rounded-bl"],"rounded-s":["rounded-ss","rounded-es"],"rounded-e":["rounded-se","rounded-ee"],"rounded-t":["rounded-tl","rounded-tr"],"rounded-r":["rounded-tr","rounded-br"],"rounded-b":["rounded-br","rounded-bl"],"rounded-l":["rounded-tl","rounded-bl"],"border-spacing":["border-spacing-x","border-spacing-y"],"border-w":["border-w-x","border-w-y","border-w-s","border-w-e","border-w-bs","border-w-be","border-w-t","border-w-r","border-w-b","border-w-l"],"border-w-x":["border-w-r","border-w-l"],"border-w-y":["border-w-t","border-w-b"],"border-color":["border-color-x","border-color-y","border-color-s","border-color-e","border-color-bs","border-color-be","border-color-t","border-color-r","border-color-b","border-color-l"],"border-color-x":["border-color-r","border-color-l"],"border-color-y":["border-color-t","border-color-b"],translate:["translate-x","translate-y","translate-none"],"translate-none":["translate","translate-x","translate-y","translate-z"],"scroll-m":["scroll-mx","scroll-my","scroll-ms","scroll-me","scroll-mbs","scroll-mbe","scroll-mt","scroll-mr","scroll-mb","scroll-ml"],"scroll-mx":["scroll-mr","scroll-ml"],"scroll-my":["scroll-mt","scroll-mb"],"scroll-p":["scroll-px","scroll-py","scroll-ps","scroll-pe","scroll-pbs","scroll-pbe","scroll-pt","scroll-pr","scroll-pb","scroll-pl"],"scroll-px":["scroll-pr","scroll-pl"],"scroll-py":["scroll-pt","scroll-pb"],touch:["touch-x","touch-y","touch-pz"],"touch-x":["touch"],"touch-y":["touch"],"touch-pz":["touch"]},conflictingClassGroupModifiers:{"font-size":["leading"]},orderSensitiveModifiers:["*","**","after","backdrop","before","details-content","file","first-letter","first-line","marker","placeholder","selection"]}},vs=Kr(ga);var Ie={};(function e(r,a,n,c){var l=!!(r.Worker&&r.Blob&&r.Promise&&r.OffscreenCanvas&&r.OffscreenCanvasRenderingContext2D&&r.HTMLCanvasElement&&r.HTMLCanvasElement.prototype.transferControlToOffscreen&&r.URL&&r.URL.createObjectURL),i=typeof Path2D=="function"&&typeof DOMMatrix=="function",h=(function(){if(!r.OffscreenCanvas)return!1;try{var t=new OffscreenCanvas(1,1),o=t.getContext("2d");o.fillRect(0,0,1,1);var u=t.transferToImageBitmap();o.createPattern(u,"no-repeat")}catch{return!1}return!0})();function d(){}function b(t){var o=a.exports.Promise,u=o!==void 0?o:r.Promise;return typeof u=="function"?new u(t):(t(d,d),null)}var z=(function(t,o){return{transform:function(u){if(t)return u;if(o.has(u))return o.get(u);var v=new OffscreenCanvas(u.width,u.height),w=v.getContext("2d");return w.drawImage(u,0,0),o.set(u,v),v},clear:function(){o.clear()}}})(h,new Map),S=(function(){var t=Math.floor(16.666666666666668),o,u,v={},w=0;return typeof requestAnimationFrame=="function"&&typeof cancelAnimationFrame=="function"?(o=function(m){var g=Math.random();return v[g]=requestAnimationFrame(function k(M){w===M||w+t-1<M?(w=M,delete v[g],m()):v[g]=requestAnimationFrame(k)}),g},u=function(m){v[m]&&cancelAnimationFrame(v[m])}):(o=function(m){return setTimeout(m,t)},u=function(m){return clearTimeout(m)}),{frame:o,cancel:u}})(),L=(function(){var t,o,u={};function v(w){function m(g,k){w.postMessage({options:g||{},callback:k})}w.init=function(k){var M=k.transferControlToOffscreen();w.postMessage({canvas:M},[M])},w.fire=function(k,M,x){if(o)return m(k,null),o;var j=Math.random().toString(36).slice(2);return o=b(function($){function A(I){I.data.callback===j&&(delete u[j],w.removeEventListener("message",A),o=null,z.clear(),x(),$())}w.addEventListener("message",A),m(k,j),u[j]=A.bind(null,{data:{callback:j}})}),o},w.reset=function(){w.postMessage({reset:!0});for(var k in u)u[k](),delete u[k]}}return function(){if(t)return t;if(!n&&l){var w=["var CONFETTI, SIZE = {}, module = {};","("+e.toString()+")(this, module, true, SIZE);","onmessage = function(msg) {","  if (msg.data.options) {","    CONFETTI(msg.data.options).then(function () {","      if (msg.data.callback) {","        postMessage({ callback: msg.data.callback });","      }","    });","  } else if (msg.data.reset) {","    CONFETTI && CONFETTI.reset();","  } else if (msg.data.resize) {","    SIZE.width = msg.data.resize.width;","    SIZE.height = msg.data.resize.height;","  } else if (msg.data.canvas) {","    SIZE.width = msg.data.canvas.width;","    SIZE.height = msg.data.canvas.height;","    CONFETTI = module.exports.create(msg.data.canvas);","  }","}"].join(`
`);try{t=new Worker(URL.createObjectURL(new Blob([w])))}catch(m){return typeof console<"u"&&typeof console.warn=="function"&&console.warn("🎊 Could not load worker",m),null}v(t)}return t}})(),B={particleCount:50,angle:90,spread:45,startVelocity:45,decay:.9,gravity:1,drift:0,ticks:200,x:.5,y:.5,shapes:["square","circle"],zIndex:100,colors:["#26ccff","#a25afd","#ff5e7e","#88ff5a","#fcff42","#ffa62d","#ff36ff"],disableForReducedMotion:!1,scalar:1};function D(t,o){return o?o(t):t}function q(t){return t!=null}function N(t,o,u){return D(t&&q(t[o])?t[o]:B[o],u)}function G(t){return t<0?0:Math.floor(t)}function ie(t,o){return Math.floor(Math.random()*(o-t))+t}function W(t){return parseInt(t,16)}function Q(t){return t.map(X)}function X(t){var o=String(t).replace(/[^0-9a-f]/gi,"");return o.length<6&&(o=o[0]+o[0]+o[1]+o[1]+o[2]+o[2]),{r:W(o.substring(0,2)),g:W(o.substring(2,4)),b:W(o.substring(4,6))}}function U(t){var o=N(t,"origin",Object);return o.x=N(o,"x",Number),o.y=N(o,"y",Number),o}function ae(t){t.width=document.documentElement.clientWidth,t.height=document.documentElement.clientHeight}function f(t){var o=t.getBoundingClientRect();t.width=o.width,t.height=o.height}function T(t){var o=document.createElement("canvas");return o.style.position="fixed",o.style.top="0px",o.style.left="0px",o.style.pointerEvents="none",o.style.zIndex=t,o}function ge(t,o,u,v,w,m,g,k,M){t.save(),t.translate(o,u),t.rotate(m),t.scale(v,w),t.arc(0,0,1,g,k,M),t.restore()}function ke(t){var o=t.angle*(Math.PI/180),u=t.spread*(Math.PI/180);return{x:t.x,y:t.y,wobble:Math.random()*10,wobbleSpeed:Math.min(.11,Math.random()*.1+.05),velocity:t.startVelocity*.5+Math.random()*t.startVelocity,angle2D:-o+(.5*u-Math.random()*u),tiltAngle:(Math.random()*(.75-.25)+.25)*Math.PI,color:t.color,shape:t.shape,tick:0,totalTicks:t.ticks,decay:t.decay,drift:t.drift,random:Math.random()+2,tiltSin:0,tiltCos:0,wobbleX:0,wobbleY:0,gravity:t.gravity*3,ovalScalar:.6,scalar:t.scalar,flat:t.flat}}function le(t,o){o.x+=Math.cos(o.angle2D)*o.velocity+o.drift,o.y+=Math.sin(o.angle2D)*o.velocity+o.gravity,o.velocity*=o.decay,o.flat?(o.wobble=0,o.wobbleX=o.x+10*o.scalar,o.wobbleY=o.y+10*o.scalar,o.tiltSin=0,o.tiltCos=0,o.random=1):(o.wobble+=o.wobbleSpeed,o.wobbleX=o.x+10*o.scalar*Math.cos(o.wobble),o.wobbleY=o.y+10*o.scalar*Math.sin(o.wobble),o.tiltAngle+=.1,o.tiltSin=Math.sin(o.tiltAngle),o.tiltCos=Math.cos(o.tiltAngle),o.random=Math.random()+2);var u=o.tick++/o.totalTicks,v=o.x+o.random*o.tiltCos,w=o.y+o.random*o.tiltSin,m=o.wobbleX+o.random*o.tiltCos,g=o.wobbleY+o.random*o.tiltSin;if(t.fillStyle="rgba("+o.color.r+", "+o.color.g+", "+o.color.b+", "+(1-u)+")",t.beginPath(),i&&o.shape.type==="path"&&typeof o.shape.path=="string"&&Array.isArray(o.shape.matrix))t.fill(Y(o.shape.path,o.shape.matrix,o.x,o.y,Math.abs(m-v)*.1,Math.abs(g-w)*.1,Math.PI/10*o.wobble));else if(o.shape.type==="bitmap"){var k=Math.PI/10*o.wobble,M=Math.abs(m-v)*.1,x=Math.abs(g-w)*.1,j=o.shape.bitmap.width*o.scalar,$=o.shape.bitmap.height*o.scalar,A=new DOMMatrix([Math.cos(k)*M,Math.sin(k)*M,-Math.sin(k)*x,Math.cos(k)*x,o.x,o.y]);A.multiplySelf(new DOMMatrix(o.shape.matrix));var I=t.createPattern(z.transform(o.shape.bitmap),"no-repeat");I.setTransform(A),t.globalAlpha=1-u,t.fillStyle=I,t.fillRect(o.x-j/2,o.y-$/2,j,$),t.globalAlpha=1}else if(o.shape==="circle")t.ellipse?t.ellipse(o.x,o.y,Math.abs(m-v)*o.ovalScalar,Math.abs(g-w)*o.ovalScalar,Math.PI/10*o.wobble,0,2*Math.PI):ge(t,o.x,o.y,Math.abs(m-v)*o.ovalScalar,Math.abs(g-w)*o.ovalScalar,Math.PI/10*o.wobble,0,2*Math.PI);else if(o.shape==="star")for(var C=Math.PI/2*3,F=4*o.scalar,O=8*o.scalar,V=o.x,Z=o.y,ne=5,H=Math.PI/ne;ne--;)V=o.x+Math.cos(C)*O,Z=o.y+Math.sin(C)*O,t.lineTo(V,Z),C+=H,V=o.x+Math.cos(C)*F,Z=o.y+Math.sin(C)*F,t.lineTo(V,Z),C+=H;else t.moveTo(Math.floor(o.x),Math.floor(o.y)),t.lineTo(Math.floor(o.wobbleX),Math.floor(w)),t.lineTo(Math.floor(m),Math.floor(g)),t.lineTo(Math.floor(v),Math.floor(o.wobbleY));return t.closePath(),t.fill(),o.tick<o.totalTicks}function be(t,o,u,v,w){var m=o.slice(),g=t.getContext("2d"),k,M,x=b(function(j){function $(){k=M=null,g.clearRect(0,0,v.width,v.height),z.clear(),w(),j()}function A(){n&&!(v.width===c.width&&v.height===c.height)&&(v.width=t.width=c.width,v.height=t.height=c.height),!v.width&&!v.height&&(u(t),v.width=t.width,v.height=t.height),g.clearRect(0,0,v.width,v.height),m=m.filter(function(I){return le(g,I)}),m.length?k=S.frame(A):$()}k=S.frame(A),M=$});return{addFettis:function(j){return m=m.concat(j),x},canvas:t,promise:x,reset:function(){k&&S.cancel(k),M&&M()}}}function de(t,o){var u=!t,v=!!N(o||{},"resize"),w=!1,m=N(o,"disableForReducedMotion",Boolean),g=l&&!!N(o||{},"useWorker"),k=g?L():null,M=u?ae:f,x=t&&k?!!t.__confetti_initialized:!1,j=typeof matchMedia=="function"&&matchMedia("(prefers-reduced-motion)").matches,$;function A(C,F,O){for(var V=N(C,"particleCount",G),Z=N(C,"angle",Number),ne=N(C,"spread",Number),H=N(C,"startVelocity",Number),ht=N(C,"decay",Number),pt=N(C,"gravity",Number),yt=N(C,"drift",Number),Le=N(C,"colors",Q),ut=N(C,"ticks",Number),Pe=N(C,"shapes"),mt=N(C,"scalar"),ft=!!N(C,"flat"),Te=U(C),Re=V,_e=[],gt=t.width*Te.x,kt=t.height*Te.y;Re--;)_e.push(ke({x:gt,y:kt,angle:Z,spread:ne,startVelocity:H,color:Le[Re%Le.length],shape:Pe[ie(0,Pe.length)],ticks:ut,decay:ht,gravity:pt,drift:yt,scalar:mt,flat:ft}));return $?$.addFettis(_e):($=be(t,_e,M,F,O),$.promise)}function I(C){var F=m||N(C,"disableForReducedMotion",Boolean),O=N(C,"zIndex",Number);if(F&&j)return b(function(H){H()});u&&$?t=$.canvas:u&&!t&&(t=T(O),document.body.appendChild(t)),v&&!x&&M(t);var V={width:t.width,height:t.height};k&&!x&&k.init(t),x=!0,k&&(t.__confetti_initialized=!0);function Z(){if(k){var H={getBoundingClientRect:function(){if(!u)return t.getBoundingClientRect()}};M(H),k.postMessage({resize:{width:H.width,height:H.height}});return}V.width=V.height=null}function ne(){$=null,v&&(w=!1,r.removeEventListener("resize",Z)),u&&t&&(document.body.contains(t)&&document.body.removeChild(t),t=null,x=!1)}return v&&!w&&(w=!0,r.addEventListener("resize",Z,!1)),k?k.fire(C,V,ne):A(C,V,ne)}return I.reset=function(){k&&k.reset(),$&&$.reset()},I}var E;function R(){return E||(E=de(null,{useWorker:!0,resize:!0})),E}function Y(t,o,u,v,w,m,g){var k=new Path2D(t),M=new Path2D;M.addPath(k,new DOMMatrix(o));var x=new Path2D;return x.addPath(M,new DOMMatrix([Math.cos(g)*w,Math.sin(g)*w,-Math.sin(g)*m,Math.cos(g)*m,u,v])),x}function he(t){if(!i)throw new Error("path confetti are not supported in this browser");var o,u;typeof t=="string"?o=t:(o=t.path,u=t.matrix);var v=new Path2D(o),w=document.createElement("canvas"),m=w.getContext("2d");if(!u){for(var g=1e3,k=g,M=g,x=0,j=0,$,A,I=0;I<g;I+=2)for(var C=0;C<g;C+=2)m.isPointInPath(v,I,C,"nonzero")&&(k=Math.min(k,I),M=Math.min(M,C),x=Math.max(x,I),j=Math.max(j,C));$=x-k,A=j-M;var F=10,O=Math.min(F/$,F/A);u=[O,0,0,O,-Math.round($/2+k)*O,-Math.round(A/2+M)*O]}return{type:"path",path:o,matrix:u}}function pe(t){var o,u=1,v="#000000",w='"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "EmojiOne Color", "Android Emoji", "Twemoji Mozilla", "system emoji", sans-serif';typeof t=="string"?o=t:(o=t.text,u="scalar"in t?t.scalar:u,w="fontFamily"in t?t.fontFamily:w,v="color"in t?t.color:v);var m=10*u,g=""+m+"px "+w,k=new OffscreenCanvas(m,m),M=k.getContext("2d");M.font=g;var x=M.measureText(o),j=Math.ceil(x.actualBoundingBoxRight+x.actualBoundingBoxLeft),$=Math.ceil(x.actualBoundingBoxAscent+x.actualBoundingBoxDescent),A=2,I=x.actualBoundingBoxLeft+A,C=x.actualBoundingBoxAscent+A;j+=A+A,$+=A+A,k=new OffscreenCanvas(j,$),M=k.getContext("2d"),M.font=g,M.fillStyle=v,M.fillText(o,I,C);var F=1/u;return{type:"bitmap",bitmap:k.transferToImageBitmap(),matrix:[F,0,0,F,-j*F/2,-$*F/2]}}a.exports=function(){return R().apply(this,arguments)},a.exports.reset=function(){R().reset()},a.exports.create=de,a.exports.shapeFromPath=he,a.exports.shapeFromText=pe})((function(){return typeof window<"u"?window:typeof self<"u"?self:this||{}})(),Ie,!1);const xs=Ie.exports;Ie.exports.create;export{gn as $,Ma as A,Na as B,Ta as C,kn as D,ns as E,Ka as F,tn as G,en as H,os as I,Va as J,dn as K,wn as L,$n as M,Fa as N,Da as O,Rn as P,Jn as Q,On as R,Zn as S,ts as T,hs as U,Qn as V,ps as W,ys as X,Wa as Y,xs as Z,ss as _,ja as a,Ua as a0,Ea as a1,Ba as a2,rn as a3,Vn as a4,Ja as a5,jn as a6,Za as a7,Ya as a8,rs as a9,ln as aA,nn as aB,vn as aC,bn as aD,Fn as aE,zn as aF,Ra as aG,Nn as aH,Sn as aI,cs as aJ,Aa as aK,Qa as aL,_a as aM,Ca as aN,En as aO,Mn as aP,hn as aQ,An as aR,Ha as aS,on as aT,Oa as aU,ms as aa,fs as ab,_n as ac,ds as ad,Pn as ae,Tn as af,pn as ag,us as ah,Yn as ai,Cn as aj,Xa as ak,wa as al,In as am,fn as an,an as ao,is as ap,qn as aq,Hn as ar,Ln as as,sn as at,Kn as au,cn as av,ls as aw,qa as ax,Ga as ay,za as az,Gn as b,Un as c,bs as d,Xn as e,es as f,ks as g,ba as h,gs as i,yn as j,un as k,mn as l,va as m,Wn as n,Dn as o,Bn as p,Sa as q,xn as r,$a as s,vs as t,Ae as u,as as v,xa as w,Pa as x,La as y,Ia as z};
