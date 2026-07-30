
          window._cleanCust = function(name) {
            if (!name || typeof name !== 'string') return name || '';
            return name.trim().replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, '').trim();
          };
        