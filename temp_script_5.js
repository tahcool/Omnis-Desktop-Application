
                          (function() {
                            let S = null;
                            window.openProfileCropModal = function(input) {
                              const file = input.files[0]; input.value = ''; if (!file) return;
                              const reader = new FileReader();
                              reader.onload = e => {
                                const img = new Image();
                                img.onload = () => {
                                  const modal = document.getElementById('profile-crop-modal');
                                  const canvas = document.getElementById('profile-crop-canvas');
                                  const DISPLAY_SIZE = Math.min(380, window.innerWidth * 0.5);
                                  canvas.width = DISPLAY_SIZE; canvas.height = DISPLAY_SIZE;
                                  const fitScale = Math.max(DISPLAY_SIZE / img.width, DISPLAY_SIZE / img.height);
                                  S = { img, canvas, scale: fitScale, ox: (DISPLAY_SIZE - img.width * fitScale) / 2, oy: (DISPLAY_SIZE - img.height * fitScale) / 2, dragging: false, lastX: 0, lastY: 0, size: DISPLAY_SIZE };
                                  document.getElementById('profile-crop-zoom').value = fitScale;
                                  document.getElementById('profile-crop-zoom').min = fitScale * 0.5;
                                  document.getElementById('profile-crop-zoom').max = fitScale * 4;
                                  window._cropState = S; window._cropDraw(); modal.style.display = 'flex'; _bindCropEvents();
                                }; img.src = e.target.result;
                              }; reader.readAsDataURL(file);
                            };
                            window._cropDraw = function() {
                              if (!S) return;
                              const ctx = S.canvas.getContext('2d'), sz = S.size;
                              ctx.clearRect(0, 0, sz, sz);
                              ctx.save(); ctx.drawImage(S.img, S.ox, S.oy, S.img.width * S.scale, S.img.height * S.scale); ctx.restore();
                              ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, sz, sz); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(sz/2, sz/2, sz/2-8, 0, Math.PI*2); ctx.fill(); ctx.restore();
                              ctx.save(); ctx.beginPath(); ctx.arc(sz/2, sz/2, sz/2-8, 0, Math.PI*2); ctx.clip(); ctx.drawImage(S.img, S.ox, S.oy, S.img.width * S.scale, S.img.height * S.scale); ctx.restore();
                              ctx.save(); ctx.strokeStyle = '#8b2219'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sz/2, sz/2, sz/2-8, 0, Math.PI*2); ctx.stroke(); ctx.restore();
                              const prev = document.getElementById('profile-crop-preview'), pCtx = prev.getContext('2d'), r = sz/2-8;
                              pCtx.clearRect(0,0,80,80); pCtx.save(); pCtx.beginPath(); pCtx.arc(40,40,40,0,Math.PI*2); pCtx.clip(); pCtx.drawImage(S.canvas, sz/2-r, sz/2-r, r*2, r*2, 0, 0, 80, 80); pCtx.restore();
                            };
                            function _bindCropEvents() {
                              const canvas = document.getElementById('profile-crop-canvas');
                              const fresh = canvas.cloneNode(true); canvas.parentNode.replaceChild(fresh, canvas); S.canvas = fresh; window._cropState = S;
                              fresh.addEventListener('mousedown', e => { S.dragging=true; S.lastX=e.clientX; S.lastY=e.clientY; fresh.style.cursor='grabbing'; });
                              fresh.addEventListener('mousemove', e => { if(!S.dragging) return; S.ox+=e.clientX-S.lastX; S.oy+=e.clientY-S.lastY; S.lastX=e.clientX; S.lastY=e.clientY; window._cropDraw(); });
                              fresh.addEventListener('mouseup', () => { S.dragging=false; fresh.style.cursor='grab'; });
                              fresh.addEventListener('mouseleave', () => { S.dragging=false; fresh.style.cursor='grab'; });
                              fresh.addEventListener('wheel', e => { e.preventDefault(); const d=e.deltaY<0?1.06:0.94, cx=S.size/2, cy=S.size/2; S.ox=cx-(cx-S.ox)*d; S.oy=cy-(cy-S.oy)*d; S.scale*=d; document.getElementById('profile-crop-zoom').value=S.scale; window._cropDraw(); }, {passive:false});
                              let ltd=null;
                              fresh.addEventListener('touchstart', e => { if(e.touches.length===1){S.dragging=true;S.lastX=e.touches[0].clientX;S.lastY=e.touches[0].clientY;} if(e.touches.length===2){ltd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);} });
                              fresh.addEventListener('touchmove', e => { e.preventDefault(); if(e.touches.length===1&&S.dragging){S.ox+=e.touches[0].clientX-S.lastX;S.oy+=e.touches[0].clientY-S.lastY;S.lastX=e.touches[0].clientX;S.lastY=e.touches[0].clientY;window._cropDraw();} if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(ltd){S.scale*=d/ltd;window._cropDraw();}ltd=d;} },{passive:false});
                              fresh.addEventListener('touchend', () => { S.dragging=false; ltd=null; });
                            }
                            window.confirmProfileCrop = function() {
                              if(!S) return;
                              const out=document.createElement('canvas'); out.width=256; out.height=256;
                              const octx=out.getContext('2d'), sz=S.size, r=sz/2-8;
                              octx.save(); octx.beginPath(); octx.arc(128,128,128,0,Math.PI*2); octx.clip(); octx.drawImage(S.canvas,sz/2-r,sz/2-r,r*2,r*2,0,0,256,256); octx.restore();
                              const dataUrl=out.toDataURL('image/png');
                              localStorage.setItem('omnis_profile_photo', dataUrl);
                              const img=document.getElementById('profile-avatar-img'), letter=document.getElementById('profile-avatar-letter');
                              img.src=dataUrl; img.style.display='block'; letter.style.display='none';
                              window.closeProfileCropModal();
                            };
                            window.closeProfileCropModal = function() { document.getElementById('profile-crop-modal').style.display='none'; S=null; window._cropState=null; };
                            document.getElementById('profile-crop-modal').addEventListener('click', function(e){ if(e.target===this) window.closeProfileCropModal(); });
                          })();
                          