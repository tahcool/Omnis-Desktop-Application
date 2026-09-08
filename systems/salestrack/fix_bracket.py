import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\index.html"
with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# Fix the missing closing bracket for runDailyWhatsAppDispatch
bad_code = """      } catch (err) {
        console.error("[WhatsApp Automation] Error running dispatch:", err);
      }
    function startWhatsAppAutomatedDispatcher() {"""

good_code = """      } catch (err) {
        console.error("[WhatsApp Automation] Error running dispatch:", err);
      }
    } // <-- Added missing closing bracket
    function startWhatsAppAutomatedDispatcher() {"""

html = html.replace(bad_code, good_code)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)
    
print("Fixed missing bracket in index.html")
