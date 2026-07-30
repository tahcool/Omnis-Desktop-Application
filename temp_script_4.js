
            document.addEventListener("DOMContentLoaded", () => {
                const initOemBanner = async () => {
                    if (!window._stockCompanyMappings || window._stockCompanyMappings.length === 0) {
                        if (window.omnisFetchStockCompanyMappings) {
                            try { await window.omnisFetchStockCompanyMappings(); } catch (e) {}
                        }
                    }
                    
                    const container = document.getElementById('oem-logos-banner-items');
                    if (!container) return;
                    
                    if (!window._stockCompanyMappings || window._stockCompanyMappings.length === 0) {
                        return; // No mappings found
                    }
                    
                    let html = '';
                    const validMappings = window._stockCompanyMappings.filter(m => m.logo_url && m.logo_url.trim() !== '');
                    const uniqueBrands = [];
                    const seenBrands = new Set();
                    validMappings.forEach(m => {
                        const bLower = (m.brand || '').toLowerCase();
                        if (!seenBrands.has(bLower)) {
                            seenBrands.add(bLower);
                            uniqueBrands.push(m);
                        }
                    });

                    if (uniqueBrands.length > 0) {
                        uniqueBrands.forEach(m => {
                            const brandSafe = m.brand.replace(/'/g, "\\'");
                            // Logos made slightly bigger (height:48px) and grey when not hovered
                            html += `<img src="${m.logo_url}" alt="${m.brand}" title="${m.brand} Performance Report" style="height:48px; width:auto; max-width:160px; object-fit:contain; cursor:pointer; filter:grayscale(100%) brightness(0.45) opacity(85%); transition:all 0.25s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.filter='drop-shadow(0 4px 10px rgba(0,0,0,0.15))'; this.style.transform='scale(1.08) translateY(-2px)';" onmouseout="this.style.filter='grayscale(100%) brightness(0.45) opacity(85%)'; this.style.transform='none';" onclick="window.salestrack.openOEMBreakdownModal('${brandSafe}', 'This Year')">`;
                        });
                    }
                    container.innerHTML = html;
                };
                
                // Slight delay to ensure salestrack dependencies are initialized
                setTimeout(initOemBanner, 1000);
            });
          