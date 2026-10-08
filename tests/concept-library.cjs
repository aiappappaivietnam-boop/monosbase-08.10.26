const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://localhost:4322/';
const fixture = (name, color, width=320, height=180) => ({name, mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/></svg>`)});
(async()=>{
 const browser = await chromium.launch({headless:true, channel:process.env.BROWSER_CHANNEL || 'msedge'});
 try {
 const context=await browser.newContext();
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();
 const library=page.getByRole('region',{name:'Thư viện hình Render Concept'});
 await library.waitFor();
 const uploader=page.getByLabel('Tải ảnh concept',{exact:true});
 await uploader.setInputFiles([fixture('front.svg','#008800'),fixture('side.svg','#888800',180,320),fixture('room.svg','#000088')]);
 await page.waitForFunction(()=>document.querySelectorAll('[data-concept-id]').length===3);
 const cards=library.locator('article');
 assert.equal(await cards.count(),3);
 assert.equal(await cards.nth(0).getByRole('button',{name:'Ảnh đại diện',exact:true}).getAttribute('aria-pressed'),'true');
 await cards.nth(1).getByRole('button',{name:'Đặt làm đại diện',exact:true}).click();
 await cards.nth(1).getByRole('button',{name:'Xem ảnh side.svg'}).click();
 const dialog=page.getByRole('dialog',{name:'Xem ảnh concept',exact:true});
 await dialog.waitFor();
 assert.equal(await dialog.getByRole('img').evaluate(img=>img.naturalWidth/img.naturalHeight),180/320);
 await page.keyboard.press('Escape');
 await dialog.waitFor({state:'hidden'});
 await cards.nth(1).getByRole('button',{name:'Xóa ảnh side.svg'}).click();
 assert.equal(await cards.count(),2);
 assert.equal(await cards.nth(0).getByRole('button',{name:'Ảnh đại diện',exact:true}).getAttribute('aria-pressed'),'true');
 // Add another upload without replacing the remaining images.
 await uploader.setInputFiles(fixture('new-view.svg','#aa0088'));
 await page.waitForFunction(()=>document.querySelectorAll('[data-concept-id]').length===3);
 await uploader.setInputFiles({name:'not-an-image.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
 await library.getByRole('alert').waitFor();
 assert.equal(await cards.count(),3);
 await cards.nth(2).getByRole('button',{name:'Đặt làm đại diện',exact:true}).click();
 const name=`Concept library test ${Date.now()}`;
 await page.getByPlaceholder('Ví dụ: Ghế Ăn Minimalist Oak M3').fill(name);
 await page.getByRole('button',{name:'Tạo Dữ Liệu Sản Phẩm Mới',exact:true}).click();
 await library.waitFor({state:'hidden'});
 await page.waitForFunction(name=>JSON.parse(localStorage.getItem('fos_products')||'[]').some(product=>product.name===name),name);
 const saved=await page.evaluate(name=>JSON.parse(localStorage.getItem('fos_products')).find(product=>product.name===name),name);
 assert.equal(saved.conceptImages.length,3);
 assert.equal(saved.conceptImages[2].url,saved.image);
 assert.equal(saved.costPriceUSD,0);
 await page.reload({waitUntil:'networkidle'});
 await page.getByText(name,{exact:true}).first().click();
 
 await page.getByText('4. Hình ảnh & Media marketing',{exact:true}).click();
 await page.getByText('Thư viện Render Concept',{exact:true}).first().waitFor();
 const stored=await page.evaluate(sku=>JSON.parse(localStorage.getItem(`fos_media_images_${sku}`)),saved.sku);
 assert.equal(stored.filter(img=>img.categoryId==='cat-concept').length,3);
 assert(stored.some(img=>img.title==='new-view.svg'));
 await page.reload({waitUntil:'networkidle'});
 const persists=await page.evaluate(name=>JSON.parse(localStorage.getItem('fos_products')).find(product=>product.name===name).conceptImages.length,name);
 assert.equal(persists,3);
 await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();
 await library.waitFor();
 assert.equal(await library.locator('article').count(),0);
 // Deleting the final preview leaves a genuinely empty library.
 await uploader.setInputFiles(fixture('temporary.svg','#008888'));
 await page.waitForFunction(()=>document.querySelectorAll('[data-concept-id]').length===1);
 await library.getByRole('button',{name:'Xóa ảnh temporary.svg'}).click();
 assert.equal(await library.locator('article').count(),0);
 // Storage exhaustion must not close the form or report a false successful save.
 await page.getByPlaceholder('Ví dụ: Ghế Ăn Minimalist Oak M3').fill('Storage failure check');
 await page.evaluate(()=>{const original=Storage.prototype.setItem;window.testRestoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(key==='fos_products') throw new DOMException('Storage full','QuotaExceededError');return original.call(this,key,value);};});
 const message=page.waitForEvent('dialog').then(async alert=>{assert(alert.message().includes('Không đủ dung lượng'));await alert.accept();});
 await page.getByRole('button',{name:'Tạo Dữ Liệu Sản Phẩm Mới',exact:true}).click();
 await message;
 assert(await library.isVisible());
 await page.evaluate(()=>window.testRestoreStorage());
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: multiple uploads, invalid file, preview aspect ratio, cover selection/removal, save/reload, product media integration, new form reset, storage failure guard');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
