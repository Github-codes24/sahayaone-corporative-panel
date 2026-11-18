import{r as e}from"./rolldown-runtime-QTnfLwEv.js";import{$n as t,D as n,Ft as r,Ln as i,Pt as a,Vt as o,a as s,ht as c,in as l}from"./vendor-react-E035Me7x.js";var u=e(t(),1);function d(e){if(!e)return{headers:[],rows:[]};let t=e.querySelector(`thead`),n=e.querySelector(`tbody`);if(!n)return{headers:[],rows:[]};let r=t?Array.from(t.querySelectorAll(`th`)):[],i=new Set,a=[];r.forEach((e,t)=>{let n=e.innerText.trim();!n||/^(action|actions|select|checkbox|#|\s*)$/i.test(n)&&e.querySelector(`input[type="checkbox"]`)?i.add(t):a.push(n)});let o=Array.from(n.querySelectorAll(`tr`)),s=[];return o.forEach(e=>{if(e.querySelector(`.animate-pulse`)||e.innerText.includes(`No records found`)||e.innerText.includes(`No data`))return;let t=Array.from(e.querySelectorAll(`td`));if(t.length===0)return;let n=[];t.forEach((e,t)=>{if(i.has(t))return;let r=e.innerText.replace(/\r?\n+/g,` `).replace(/\s+/g,` `).trim();n.push(r)}),n.length>0&&s.push(n)}),{headers:a,rows:s}}function f(e){if(e==null)return`""`;let t=String(e).trim();return t=t.replace(/"/g,`""`),`"${t}"`}function p({filename:e=`export`,title:t,columns:n,data:r,tableElement:i}){let a=[],o=[];if(r&&n)a=n.map(e=>typeof e==`string`?e:e.label||e.key),o=r.map(e=>n.map(t=>{let n=typeof t==`string`?t:t.key;return(typeof t.format==`function`?t.format(e[n],e):e[n])??``}));else if(i){let e=d(i);a=e.headers,o=e.rows}if(a.length===0&&o.length===0)throw Error(`No data available to export`);let s=[];t&&(s.push(`"${t.replace(/"/g,`""`)}"`),s.push(`"Exported on: ${new Date().toLocaleString()}"`),s.push(``)),s.push(a.map(f).join(`,`)),o.forEach(e=>{s.push(e.map(f).join(`,`))});let c=`﻿`+s.join(`\r
`);g(new Blob([c],{type:`text/csv;charset=utf-8;`}),`${_(e)}_${v()}.csv`)}function m({filename:e=`export`,title:t=`Report`,columns:n,data:r,tableElement:i}){let a=[],o=[];if(r&&n)a=n.map(e=>typeof e==`string`?e:e.label||e.key),o=r.map(e=>n.map(t=>{let n=typeof t==`string`?t:t.key;return(typeof t.format==`function`?t.format(e[n],e):e[n])??``}));else if(i){let e=d(i);a=e.headers,o=e.rows}if(a.length===0&&o.length===0)throw Error(`No data available to export`);let s=`
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${y(t.slice(0,30))}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: Calibri, Arial, sans-serif; }
        .title { font-size: 16pt; font-weight: bold; color: #225091; }
        .subtitle { font-size: 10pt; color: #666666; }
        th { background-color: #225091; color: #ffffff; font-weight: bold; padding: 8px 12px; border: 1px solid #1c4278; text-align: left; }
        td { padding: 6px 12px; border: 1px solid #e2e8f0; font-size: 10pt; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="${a.length}" class="title">${y(t)}</td></tr>
        <tr><td colspan="${a.length}" class="subtitle">Generated: ${new Date().toLocaleString()} | Sahayaone Co-operative Bank</td></tr>
        <tr></tr>
        <thead>
          <tr>
            ${a.map(e=>`<th>${y(e)}</th>`).join(``)}
          </tr>
        </thead>
        <tbody>
          ${o.map(e=>`
            <tr>
              ${e.map(e=>`<td>${y(String(e??``))}</td>`).join(``)}
            </tr>
          `).join(``)}
        </tbody>
      </table>
    </body>
    </html>
  `;g(new Blob([s],{type:`application/vnd.ms-excel;charset=utf-8;`}),`${_(e)}_${v()}.xls`)}function h({filename:e=`export`,title:t=`Report`,columns:n,data:r,tableElement:i}){let a=[],o=[];if(r&&n)a=n.map(e=>typeof e==`string`?e:e.label||e.key),o=r.map(e=>n.map(t=>{let n=typeof t==`string`?t:t.key;return(typeof t.format==`function`?t.format(e[n],e):e[n])??``}));else if(i){let e=d(i);a=e.headers,o=e.rows}if(a.length===0&&o.length===0)throw Error(`No data available to export`);let s=`
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${y(t)}</title>
      <style>
        body { font-family: Arial, sans-serif; }
        h2 { color: #225091; font-size: 16pt; margin-bottom: 4px; }
        .subtitle { font-size: 9pt; color: #666666; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #225091; color: #ffffff; font-size: 10pt; font-weight: bold; padding: 6px 10px; border: 1px solid #1c4278; text-align: left; }
        td { font-size: 9.5pt; padding: 5px 10px; border: 1px solid #cccccc; }
        tr:nth-child(even) { background-color: #f8fafc; }
      </style>
    </head>
    <body>
      <h2>${y(t)}</h2>
      <div class="subtitle">Exported on: ${new Date().toLocaleString()} | Sahayaone Co-operative Bank</div>
      <table>
        <thead>
          <tr>
            ${a.map(e=>`<th>${y(e)}</th>`).join(``)}
          </tr>
        </thead>
        <tbody>
          ${o.map(e=>`
            <tr>
              ${e.map(e=>`<td>${y(String(e??``))}</td>`).join(``)}
            </tr>
          `).join(``)}
        </tbody>
      </table>
    </body>
    </html>
  `;g(new Blob([s],{type:`application/msword;charset=utf-8;`}),`${_(e)}_${v()}.doc`)}function g(e,t){let n=URL.createObjectURL(e),r=document.createElement(`a`);r.setAttribute(`href`,n),r.setAttribute(`download`,t),r.style.visibility=`hidden`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(n)}function _(e){return String(e).toLowerCase().replace(/[^\w\s-]/g,``).replace(/[\s_-]+/g,`_`).replace(/^-+|-+$/g,``)}function v(){let e=new Date;return`${e.getFullYear()}${String(e.getMonth()+1).padStart(2,`0`)}${String(e.getDate()).padStart(2,`0`)}`}function y(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&apos;`)}var b=i();function x({title:e=`Report`,filename:t=`export`,tableRef:i,data:d,columns:f,className:g=``,buttonText:_=`Export`,disabled:v=!1,onExportPDF:y,onExportCSV:x,onExportExcel:S,onExportWord:C,onExportJSON:w,onExportPrint:T}){let[E,D]=(0,u.useState)(!1),[O,k]=(0,u.useState)(null),A=(0,u.useRef)(null);(0,u.useEffect)(()=>{function e(e){A.current&&!A.current.contains(e.target)&&D(!1)}return E&&document.addEventListener(`mousedown`,e),()=>document.removeEventListener(`mousedown`,e)},[E]);let j=async n=>{D(!1),k(n);try{n===`word`?typeof C==`function`?await C():(h({title:e,filename:t,data:d,columns:f,tableElement:i?.current}),s.success(`Word document exported successfully`)):n===`excel`?typeof S==`function`?await S():(m({title:e,filename:t,data:d,columns:f,tableElement:i?.current}),s.success(`Excel spreadsheet exported successfully`)):n===`csv`&&(typeof x==`function`?await x():(p({title:e,filename:t,data:d,columns:f,tableElement:i?.current}),s.success(`CSV exported successfully`)))}catch(e){console.error(`Export error:`,e),s.error(e.message||`Failed to export ${n.toUpperCase()}`)}finally{setTimeout(()=>k(null),300)}};return(0,b.jsxs)(`div`,{className:`relative inline-block text-left ${g}`,ref:A,children:[(0,b.jsxs)(`button`,{type:`button`,onClick:()=>D(!E),disabled:v||!!O,className:`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-colors text-xs shadow-2xs border bg-white text-gray-700 border-gray-200 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`,children:[O?(0,b.jsx)(c,{size:15,className:`animate-spin text-gray-500`}):(0,b.jsx)(o,{size:15,className:`text-gray-700`}),(0,b.jsx)(`span`,{children:O?`Exporting...`:_}),(0,b.jsx)(l,{size:13,className:`transition-transform duration-200 ${E?`rotate-180`:``}`})]}),E&&(0,b.jsx)(`div`,{className:`absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-gray-100`,children:(0,b.jsxs)(`div`,{className:`py-1`,children:[(0,b.jsxs)(`button`,{type:`button`,onClick:()=>j(`word`),className:`w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium cursor-pointer transition-colors`,children:[(0,b.jsx)(a,{size:15,className:`text-blue-600 shrink-0`}),(0,b.jsx)(`span`,{children:`Export to Word (.doc)`})]}),(0,b.jsxs)(`button`,{type:`button`,onClick:()=>j(`excel`),className:`w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium cursor-pointer transition-colors`,children:[(0,b.jsx)(r,{size:15,className:`text-emerald-600 shrink-0`}),(0,b.jsx)(`span`,{children:`Export to Excel (.xls)`})]}),(0,b.jsxs)(`button`,{type:`button`,onClick:()=>j(`csv`),className:`w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 font-medium cursor-pointer transition-colors`,children:[(0,b.jsx)(n,{size:15,className:`text-slate-600 shrink-0`}),(0,b.jsx)(`span`,{children:`Export to CSV (.csv)`})]})]})})]})}export{x as t};