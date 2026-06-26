
  let mktBlocks = [];
  let mktCurrentCampaignId = null;
  let mktDraggedItemType = null;
  let mktDraggedBlockIndex = null;

  // Hub functions
  window.marketingLoadHub = async function() {
      const grid = document.getElementById('marketing-hub-grid');
      grid.innerHTML = '<tr><td colspan="5" style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
      
      try {
          const res = await window.electron.ipcRenderer.invoke('supabase:query', {
              table: 'newsletters', method: 'select', params: { order: { column: 'created_at', options: { ascending: false } } }
          });
          if (!res.ok || !res.data || res.data.length === 0) {
              grid.innerHTML = '<tr><td colspan="5" style="padding:40px; text-align:center; color:#94a3b8;">No campaigns found.</td></tr>';
              return;
          }
          grid.innerHTML = '';
          res.data.forEach(c => {
              const statusBadge = c.status === 'Sent' 
                ? `<span style="padding:4px 8px; background:#dcfce7; color:#166534; border-radius:4px; font-size:11px; font-weight:800; text-transform:uppercase;">Sent</span>`
                : `<span style="padding:4px 8px; background:#f1f5f9; color:#64748b; border-radius:4px; font-size:11px; font-weight:800; text-transform:uppercase;">Draft</span>`;
              
              const tr = document.createElement('tr');
              tr.innerHTML = `
                  <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; font-weight:700;">${c.subject || 'Untitled'}</td>
                  <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; text-align:center;">${statusBadge}</td>
                  <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; text-align:center;">${c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '-'}</td>
                  <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; text-align:center;">${c.successful_sends} / ${c.total_audience}</td>
                  <td style="padding:16px 20px; border-bottom:1px solid #f1f5f9; text-align:right;">
                      <button onclick="window.marketingEditCampaign('${c.id}')" style="padding:6px 12px; background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;"><i class="fas fa-edit"></i> Edit</button>
                  </td>
              `;
              grid.appendChild(tr);
          });
      } catch (e) {
          grid.innerHTML = '<tr><td colspan="5" style="padding:40px; text-align:center; color:#ef4444;">Error loading campaigns</td></tr>';
      }
  };

  window.marketingOpenBuilder = function(campaign = null) {
      document.getElementById('marketing-hub').style.display = 'none';
      document.getElementById('marketing-builder').style.display = 'flex';
      
      if (campaign) {
          mktCurrentCampaignId = campaign.id;
          document.getElementById('mkt-campaign-subject').value = campaign.subject || '';
          document.getElementById('mkt-builder-status').innerText = campaign.status;
          mktBlocks = typeof campaign.blocks === 'string' ? JSON.parse(campaign.blocks) : (campaign.blocks || []);
      } else {
          mktCurrentCampaignId = null;
          document.getElementById('mkt-campaign-subject').value = '';
          document.getElementById('mkt-builder-status').innerText = 'New Draft';
          mktBlocks = [];
      }
      renderMktBlocks();
  };

  window.marketingCloseBuilder = function() {
      document.getElementById('marketing-builder').style.display = 'none';
      document.getElementById('marketing-hub').style.display = 'block';
      window.marketingLoadHub();
  };

  window.marketingEditCampaign = async function(id) {
      const res = await window.electron.ipcRenderer.invoke('supabase:query', {
          table: 'newsletters', method: 'select', params: { match: { id } }
      });
      if(res.ok && res.data && res.data[0]) {
          window.marketingOpenBuilder(res.data[0]);
      }
  };

  // Drag and Drop Logic
  document.querySelectorAll('.mkt-draggable-block').forEach(el => {
      el.addEventListener('dragstart', (e) => {
          mktDraggedItemType = e.target.getAttribute('data-type');
          mktDraggedBlockIndex = null;
          e.dataTransfer.effectAllowed = 'copy';
      });
  });

  const canvas = document.getElementById('mkt-canvas');
  canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      canvas.style.borderColor = '#3b82f6';
      canvas.style.backgroundColor = '#f8fafc';
  });
  canvas.addEventListener('dragleave', (e) => {
      canvas.style.borderColor = 'transparent';
      canvas.style.backgroundColor = 'transparent';
  });
  canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      canvas.style.borderColor = 'transparent';
      canvas.style.backgroundColor = 'transparent';
      
      if (mktDraggedItemType) {
          // It's a new block from the toolbox
          const newBlock = { id: Date.now().toString(), type: mktDraggedItemType };
          
          if (mktDraggedItemType === 'text') {
              newBlock.content = 'Click here to edit this text...';
          } else if (mktDraggedItemType === 'image') {
              newBlock.url = 'https://placehold.co/600x300?text=Click+to+Upload+Image';
          } else if (mktDraggedItemType === 'button') {
              newBlock.label = 'Click Me';
              newBlock.link = 'https://powerstar.co.zw';
          } else if (mktDraggedItemType === 'pdf') {
              newBlock.label = 'Download PDF Document';
              newBlock.url = '';
          }
          
          mktBlocks.push(newBlock);
          renderMktBlocks();
          mktDraggedItemType = null;
      }
  });

  function renderMktBlocks() {
      if (mktBlocks.length === 0) {
          canvas.innerHTML = `
              <div id="mkt-canvas-empty" style="text-align:center; padding:60px 20px; color:#cbd5e1; font-weight:700; border:2px dashed #e2e8f0; border-radius:12px; margin-top:20px;">
                <i class="fas fa-hand-pointer" style="font-size:32px; margin-bottom:16px; display:block;"></i>
                Drop blocks here
              </div>
          `;
          return;
      }

      canvas.innerHTML = '';
      mktBlocks.forEach((block, idx) => {
          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'position:relative; padding:10px; border:1px solid transparent; transition:border 0.2s;';
          wrapper.onmouseenter = () => wrapper.style.borderColor = '#cbd5e1';
          wrapper.onmouseleave = () => wrapper.style.borderColor = 'transparent';
          
          let innerHtml = '';
          if (block.type === 'text') {
              innerHtml = `<div contenteditable="true" style="outline:none; font-family:sans-serif; color:#334155; line-height:1.6;" onblur="mktUpdateBlock(${idx}, 'content', this.innerText)">${block.content}</div>`;
          } else if (block.type === 'image') {
              innerHtml = `<div style="text-align:center; cursor:pointer;" onclick="mktUploadImage(${idx})"><img src="${block.url}" style="max-width:100%; border-radius:8px;" /></div>`;
          } else if (block.type === 'button') {
              innerHtml = `<div style="text-align:center;">
                  <button onclick="mktEditButton(${idx})" style="background:#2563eb; color:white; border:none; padding:12px 24px; border-radius:6px; font-size:16px; font-weight:700; cursor:pointer;">${block.label}</button>
              </div>`;
          } else if (block.type === 'pdf') {
              innerHtml = `<div style="text-align:center; padding:20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;" onclick="mktUploadPdf(${idx})">
                  <i class="fas fa-file-pdf" style="font-size:32px; color:#ef4444; margin-bottom:10px; display:block;"></i>
                  <span style="font-weight:700; color:#334155;">${block.label}</span>
                  ${block.url ? `<br><a href="${block.url}" target="_blank" style="font-size:12px; color:#3b82f6;">View Attached File</a>` : ''}
              </div>`;
          }

          // Delete controls
          const controls = document.createElement('div');
          controls.style.cssText = 'position:absolute; top:0; right:0; display:none; background:white; border:1px solid #e2e8f0; border-radius:4px; overflow:hidden; z-index:10;';
          controls.innerHTML = `
              <button onclick="mktMoveBlock(${idx}, -1)" style="padding:6px 10px; border:none; background:white; cursor:pointer;"><i class="fas fa-arrow-up"></i></button>
              <button onclick="mktMoveBlock(${idx}, 1)" style="padding:6px 10px; border:none; border-left:1px solid #e2e8f0; background:white; cursor:pointer;"><i class="fas fa-arrow-down"></i></button>
              <button onclick="mktDeleteBlock(${idx})" style="padding:6px 10px; border:none; border-left:1px solid #e2e8f0; background:#fee2e2; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
          `;
          
          wrapper.onmouseover = (e) => { e.stopPropagation(); controls.style.display = 'flex'; wrapper.style.borderColor = '#cbd5e1'; };
          wrapper.onmouseout = (e) => { e.stopPropagation(); controls.style.display = 'none'; wrapper.style.borderColor = 'transparent'; };
          
          wrapper.innerHTML = innerHtml;
          wrapper.appendChild(controls);
          canvas.appendChild(wrapper);
      });
  }

  window.mktUpdateBlock = function(idx, key, value) {
      if(mktBlocks[idx]) mktBlocks[idx][key] = value;
  };

  window.mktDeleteBlock = function(idx) {
      mktBlocks.splice(idx, 1);
      renderMktBlocks();
  };

  window.mktMoveBlock = function(idx, dir) {
      if (idx + dir < 0 || idx + dir >= mktBlocks.length) return;
      const temp = mktBlocks[idx];
      mktBlocks[idx] = mktBlocks[idx + dir];
      mktBlocks[idx + dir] = temp;
      renderMktBlocks();
  };

  window.mktEditButton = function(idx) {
      const label = prompt("Enter button text:", mktBlocks[idx].label);
      if(label) mktBlocks[idx].label = label;
      const link = prompt("Enter button URL:", mktBlocks[idx].link);
      if(link) mktBlocks[idx].link = link;
      renderMktBlocks();
  };

  window.mktUploadImage = async function(idx) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if(!file) return;
          if (window.showToast) window.showToast("Uploading image...", "info");
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
          const filePath = `newsletters/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          
          const res = await window.electron.ipcRenderer.invoke('storage:upload', {
              bucket: 'psv-attachments', // Reuse for now or create marketing bucket later
              path: filePath,
              base64Data: base64,
              contentType: file.type
          });
          if(res.ok) {
              mktBlocks[idx].url = res.url;
              renderMktBlocks();
              if (window.showToast) window.showToast("Image uploaded!", "success");
          } else {
              if (window.showToast) window.showToast("Upload failed", "error");
              else alert("Upload failed: " + (res.error || "Unknown error"));
          }
      };
      fileInput.click();
  };

  window.mktUploadPdf = async function(idx) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'application/pdf';
      fileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if(!file) return;
          if (window.showToast) window.showToast("Uploading PDF...", "info");
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
          const filePath = `newsletters/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          
          const res = await window.electron.ipcRenderer.invoke('storage:upload', {
              bucket: 'psv-attachments', 
              path: filePath,
              base64Data: base64,
              contentType: file.type
          });
          if(res.ok) {
              mktBlocks[idx].url = res.url;
              mktBlocks[idx].label = file.name;
              renderMktBlocks();
              if (window.showToast) window.showToast("PDF uploaded!", "success");
          } else {
              if (window.showToast) window.showToast("Upload failed", "error");
              else alert("Upload failed");
          }
      };
      fileInput.click();
  };

  window.marketingUpdateChannels = function() {
      const waChecked = document.getElementById('mkt-channel-whatsapp').checked;
      document.getElementById('mkt-whatsapp-composer').style.display = waChecked ? 'block' : 'none';
      window.marketingSaveDraftDebounced();
  };

  let mktDraftTimeout = null;
  window.marketingSaveDraftDebounced = function() {
      if (mktDraftTimeout) clearTimeout(mktDraftTimeout);
      mktDraftTimeout = setTimeout(() => { window.marketingSaveDraft(true); }, 1000);
  };

  window.marketingSaveDraft = async function(silent = false) {
      const subject = document.getElementById('mkt-campaign-subject').value;
      if (!subject) {
          if(!silent) {
              if (window.showToast) window.showToast('Please enter a campaign subject', 'warning');
              else alert('Please enter a campaign subject');
          }
          return false;
      }
      
      const emailChecked = document.getElementById('mkt-channel-email').checked;
      const waChecked = document.getElementById('mkt-channel-whatsapp').checked;
      const waMessage = document.getElementById('mkt-whatsapp-text').value;

      // Extract config block or create one
      let configBlockIndex = mktBlocks.findIndex(b => b.type === 'config');
      if(configBlockIndex > -1) mktBlocks.splice(configBlockIndex, 1);
      
      mktBlocks.unshift({
          type: 'config',
          email: emailChecked,
          whatsapp: waChecked,
          whatsapp_message: waMessage
      });
      
      const currentUser = window.globalSessionUser || 'Unknown User';
      const payload = {
          subject: subject,
          blocks: mktBlocks,
          created_by: currentUser,
          status: 'Draft'
      };

      try {
          if (mktCurrentCampaignId) {
              payload.id = mktCurrentCampaignId;
              const res = await window.electron.ipcRenderer.invoke('supabase:query', {
                  table: 'newsletters', method: 'upsert', data: payload
              });
              if(!res.ok) throw new Error("DB Error");
          } else {
              const res = await window.electron.ipcRenderer.invoke('supabase:query', {
                  table: 'newsletters', method: 'insert', data: payload, params: { columns: 'id' }
              });
              if(!res.ok) throw new Error("DB Error");
              // Assuming standard insert response returns data
              if(res.data && res.data[0]) mktCurrentCampaignId = res.data[0].id;
          }
          if(!silent) window.showToast('Draft saved successfully', 'success');
          return true;
      } catch (e) {
          if(!silent) window.showToast('Failed to save draft', 'error');
          return false;
      }
  };

  // Override marketingOpenBuilder to restore config block correctly
  window.originalMarketingOpenBuilder = window.marketingOpenBuilder;
  window.marketingOpenBuilder = function(campaign = null) {
      window.originalMarketingOpenBuilder(campaign);
      
      // Look for config block
      const configBlockIndex = mktBlocks.findIndex(b => b.type === 'config');
      if (configBlockIndex > -1) {
          const config = mktBlocks[configBlockIndex];
          document.getElementById('mkt-channel-email').checked = !!config.email;
          document.getElementById('mkt-channel-whatsapp').checked = !!config.whatsapp;
          document.getElementById('mkt-whatsapp-text').value = config.whatsapp_message || '';
          // Remove from rendering array
          mktBlocks.splice(configBlockIndex, 1);
      } else {
          document.getElementById('mkt-channel-email').checked = true;
          document.getElementById('mkt-channel-whatsapp').checked = false;
          document.getElementById('mkt-whatsapp-text').value = '';
      }
      window.marketingUpdateChannels();
  };

  let mktDispatchCancelToken = false;
  window.marketingCancelDispatch = function() {
      mktDispatchCancelToken = true;
      document.getElementById('mkt-btn-cancel').style.display = 'none';
      document.getElementById('mkt-btn-close').style.display = 'block';
      document.getElementById('mkt-dispatch-status-text').innerText = 'Dispatch Cancelled by User.';
  };

  // Dispatch Engine
  window.marketingOpenDispatchModal = async function() {
      // Auto-save draft first
      const saved = await window.marketingSaveDraft(true);
      if(!saved) return window.showToast('Could not save campaign. Enter a subject.', 'error');
      
      const emailChecked = document.getElementById('mkt-channel-email').checked;
      const waChecked = document.getElementById('mkt-channel-whatsapp').checked;
      let channels = [];
      if(emailChecked) channels.push("Email");
      if(waChecked) channels.push("WhatsApp");
      document.getElementById('mkt-dispatch-ready-text').innerText = `This broadcast will be sent to every customer via: ${channels.join(' & ')}.`;
      
      document.getElementById('mkt-dispatch-modal').style.display = 'flex';
      document.getElementById('mkt-dispatch-progress-area').style.display = 'none';
      document.getElementById('mkt-btn-send').style.display = 'block';
      document.getElementById('mkt-btn-cancel').style.display = 'none';
      document.getElementById('mkt-btn-close').style.display = 'block';
      
      // Reset progress
      document.getElementById('mkt-dispatch-bar').style.width = '0%';
      document.getElementById('mkt-dispatch-count').innerText = '0 / 0';
  };

  window.marketingStartDispatch = async function() {
      mktDispatchCancelToken = false;
      document.getElementById('mkt-dispatch-progress-area').style.display = 'flex';
      document.getElementById('mkt-btn-send').style.display = 'none';
      document.getElementById('mkt-btn-close').style.display = 'none';
      document.getElementById('mkt-btn-cancel').style.display = 'block';
      document.getElementById('mkt-dispatch-status-text').innerText = 'Fetching audience...';

      try {
          const res = await window.electron.ipcRenderer.invoke('supabase:query', {
              table: 'customers', method: 'select', params: { columns: 'id, customer_name', range: {from:0, to:4999} }
          });
          
          if (!res.ok || !res.data) throw new Error("Failed to load audience");

          const total = res.data.length;
          
          if (total === 0) {
              document.getElementById('mkt-dispatch-status-text').innerText = 'No customers found.';
              document.getElementById('mkt-btn-cancel').style.display = 'none';
              document.getElementById('mkt-btn-close').style.display = 'block';
              return;
          }

          document.getElementById('mkt-dispatch-status-text').innerText = `Sending to ${total} customers...`;
          document.getElementById('mkt-dispatch-count').innerText = `0 / ${total}`;

          // Simulate Sending Loop
          let successful = 0;
          for(let i=0; i<total; i++) {
              if (mktDispatchCancelToken) break; // User cancelled
              
              // Simulate API call to send email/whatsapp
              await new Promise(r => setTimeout(r, 80)); 
              
              successful++;
              const percent = Math.min(100, Math.round((successful / total) * 100));
              document.getElementById('mkt-dispatch-bar').style.width = percent + '%';
              document.getElementById('mkt-dispatch-count').innerText = `${successful} / ${total}`;
          }

          if (mktDispatchCancelToken) {
              // Status was already updated in cancel func
              return;
          }

          document.getElementById('mkt-dispatch-status-text').innerText = 'Dispatch Complete!';
          document.getElementById('mkt-btn-cancel').style.display = 'none';
          document.getElementById('mkt-btn-close').style.display = 'none';
          
          // Re-insert config block for saving
          const emailChecked = document.getElementById('mkt-channel-email').checked;
          const waChecked = document.getElementById('mkt-channel-whatsapp').checked;
          const waMessage = document.getElementById('mkt-whatsapp-text').value;
          mktBlocks.unshift({
              type: 'config', email: emailChecked, whatsapp: waChecked, whatsapp_message: waMessage
          });
          
          // Update Newsletter Status in DB
          await window.electron.ipcRenderer.invoke('supabase:query', {
              table: 'newsletters', method: 'upsert', 
              data: { 
                  id: mktCurrentCampaignId, 
                  status: 'Sent', 
                  total_audience: total, 
                  successful_sends: successful, 
                  sent_at: new Date().toISOString(),
                  blocks: mktBlocks
              }
          });

          // Remove config block again from rendering array
          mktBlocks.shift();

          window.showToast('Broadcast dispatched successfully!', 'success');
          document.getElementById('mkt-builder-status').innerText = 'Sent';
          setTimeout(() => {
              document.getElementById('mkt-dispatch-modal').style.display = 'none';
          }, 2000);

      } catch (e) {
          console.error(e);
          document.getElementById('mkt-dispatch-status-text').innerText = 'Error occurred during dispatch.';
          window.showToast('Dispatch failed', 'error');
          document.getElementById('mkt-btn-cancel').style.display = 'none';
          document.getElementById('mkt-btn-close').style.display = 'block';
      }
  };

  // Bind menu click
  document.querySelector('.top-nav-item[data-view="view-marketing"]').addEventListener('click', () => {
      window.marketingLoadHub();
  });

