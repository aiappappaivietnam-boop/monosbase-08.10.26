// The existing application supplies its React runtime to avoid loading a second copy.
export function MonosConceptLibrary({react: React, jsx: jsx, images, setImages, cover, onCoverChange, onBusyChange}) {
  const [pending, setPending] = React.useState(0);
  const [error, setError] = React.useState('');
  const [preview, setPreview] = React.useState(null);
  const pendingRef = React.useRef(0);
  const input = React.useRef(null);
  const {jsx: el, jsxs: els} = jsx;
  React.useEffect(() => {
    if (!preview) return;
    const close = event => { if (event.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [preview]);
  async function upload(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    setError('');
    pendingRef.current += selected.length;
    setPending(pendingRef.current);
    onBusyChange(true);
    const results = await Promise.all(selected.map(async file => {
      try {
        if (!file.type.startsWith('image/')) throw new Error(`${file.name}: vui lòng chọn tệp hình ảnh.`);
        if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name}: ảnh tối đa 15 MB.`);
        const original = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(`${file.name}: không đọc được ảnh, vui lòng thử lại.`));
          reader.readAsDataURL(file);
        });
        const picture = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`${file.name}: tệp ảnh không hợp lệ.`));
          img.src = original;
        });
        // Preserve aspect ratio and transparency while keeping local storage manageable.
        const scale = Math.min(1, 1600 / Math.max(picture.naturalWidth, picture.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
        canvas.getContext('2d').drawImage(picture, 0, 0, canvas.width, canvas.height);
        const compact = canvas.toDataURL('image/webp', 0.88);
        return {id: crypto.randomUUID(), name: file.name, url: compact.length < original.length ? compact : original,
          width: picture.naturalWidth, height: picture.naturalHeight, uploadedAt: new Date().toISOString().slice(0, 10)};
      } catch (problem) { return {error: problem.message}; }
    }));
    const valid = results.filter(result => !result.error);
    setImages(previous => [...previous, ...valid]);
    if (valid.length) onCoverChange(previous => previous || valid[0].url);
    setError(results.filter(result => result.error).map(result => result.error).join(' '));
    pendingRef.current -= selected.length;
    setPending(pendingRef.current);
    onBusyChange(pendingRef.current > 0);
  }
  function remove(image) {
    const remaining = images.filter(item => item.id !== image.id);
    setImages(remaining);
    if (cover === image.url) onCoverChange(remaining[0]?.url || '');
    if (preview?.id === image.id) setPreview(null);
  }
  const button = 'px-3 py-2 border border-stone-200 rounded-lg text-xs cursor-pointer hover:bg-stone-100';
  return els('section', {'aria-label': 'Thư viện hình Render Concept', className: 'space-y-3 pt-3 border-t border-stone-200', children: [
    els('div', {className:'flex flex-wrap items-center justify-between gap-2', children:[
      el('h3', {className:'font-bold text-gray-900 text-xs',children:`Thư viện hình Render Concept (${images.length})`}),
      el('button',{type:'button',className:button,onClick:()=>input.current?.click(),children:'+ Thêm ảnh concept'})
    ]}),
    el('p',{className:'text-[11px] text-stone-500',children:'Tải nhiều ảnh phối cảnh, góc nhìn và phương án thiết kế. Chọn một ảnh làm đại diện sản phẩm.'}),
    el('input',{ref:input,type:'file',accept:'image/*',multiple:true,className:'hidden','aria-label':'Tải ảnh concept',onChange:event=>{upload(event.target.files);event.target.value='';}}),
    el('div',{onDragOver:event=>event.preventDefault(),onDrop:event=>{event.preventDefault();upload(event.dataTransfer.files);},className:'border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 p-4 text-center',children:
      el('button',{type:'button',className:'w-full py-3 text-xs text-stone-600 cursor-pointer',onClick:()=>input.current?.click(),children:'Chọn nhiều hình ảnh hoặc kéo & thả vào đây'})}),
    pending>0&&el('p',{role:'status',className:'text-xs text-stone-500',children:`Đang tải ${pending} ảnh...`}),
    error&&el('p',{role:'alert',className:'text-xs text-red-600',children:error}),
    images.length===0&&el('p',{className:'text-xs text-stone-400',children:'Chưa có ảnh concept.'}),
    el('div',{className:'grid grid-cols-2 sm:grid-cols-3 gap-3',children:images.map(image=>els('article',{'data-concept-id':image.id,className:'border border-stone-200 rounded-xl p-2 bg-white space-y-2',children:[
      el('button',{type:'button','aria-label':`Xem ảnh ${image.name}`,className:'w-full cursor-pointer',onClick:()=>setPreview(image),children:el('img',{src:image.url,alt:image.name,className:'w-full h-32 object-contain rounded-lg bg-stone-50'})}),
      el('p',{className:'text-[11px] text-stone-600 truncate',title:image.name,children:image.name}),
      els('div',{className:'flex flex-wrap items-center gap-1',children:[
        el('button',{type:'button','aria-pressed':cover===image.url,className:button,onClick:()=>onCoverChange(image.url),children:cover===image.url?'Ảnh đại diện':'Đặt làm đại diện'}),
        el('button',{type:'button','aria-label':`Xóa ảnh ${image.name}`,className:button,onClick:()=>remove(image),children:'Xóa'})
      ]})
    ]},image.id))}),
    preview&&el('div',{role:'dialog','aria-modal':true,'aria-label':'Xem ảnh concept',className:'fixed inset-0 bg-black/80 flex items-center justify-center p-4',style:{zIndex:120},onClick:()=>setPreview(null),children:els('div',{className:'bg-white rounded-xl p-3 max-w-3xl w-full space-y-2',onClick:event=>event.stopPropagation(),children:[
      els('div',{className:'flex justify-between items-center gap-2',children:[el('span',{className:'text-xs truncate',children:preview.name}),el('button',{type:'button',className:button,onClick:()=>setPreview(null),children:'Đóng ảnh'})]}),
      el('img',{src:preview.url,alt:preview.name,style:{maxHeight:'75vh',width:'100%',objectFit:'contain'}})
    ]})})
  ]});
}
