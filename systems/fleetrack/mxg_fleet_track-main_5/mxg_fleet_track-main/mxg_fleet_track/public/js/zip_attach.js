// mxg_fleet_track/public/js/zip_attach.js

frappe.ui.form.on("FT Machine", {
  // Trigger when the inline button is clicked
  upload_images(frm) {
    open_and_zip(frm);
  },

  onload(frm) {
    // Optional: hide default attachments if desired
    // frm.disable_attach();
  }
});

async function open_and_zip(frm) {
  if (typeof JSZip === "undefined") {
    frappe.msgprint(__('JSZip not found. Check that jszip.min.js is included in hooks.py'));
    return;
  }

  // 1) Let user pick images
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = "image/*";
  input.style.display = "none";
  document.body.appendChild(input);

  input.onchange = async e => {
    const files = Array.from(e.target.files);
    document.body.removeChild(input);
    if (!files.length) return;

    // 2) Zip with progress
    frappe.show_progress(__('Zipping Images'), 0, files.length);
    const zip = new JSZip();
    files.forEach((f, i) => {
      zip.file(f.name, f);
      frappe.show_progress(__('Zipping Images'), i + 1, files.length);
    });

    let blob;
    try {
      blob = await zip.generateAsync({ type: "blob" });
    } catch (err) {
      frappe.hide_progress();
      frappe.msgprint(__('Failed to generate ZIP.'));
      console.error(err);
      return;
    }
    frappe.hide_progress();

    // 3) Prompt for filename
    frappe.prompt(
      [{
        fieldname: "zip_name",
        label: __('ZIP Filename'),
        fieldtype: "Data",
        default: "images.zip",
        reqd: 1
      }],
      vals => upload_zip(frm, blob, vals.zip_name),
      __('Enter ZIP filename'),
      __('OK')
    );
  };

  input.click();
}

async function upload_zip(frm, blob, filename) {
  // Normalize filename
  let name = filename.trim();
  if (!name.toLowerCase().endsWith(".zip")) name += ".zip";

  // Blob → Base64
  const dataurl = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
  const base64 = dataurl.split(",")[1];

  // 4) Call your Python API
  frappe.call({
    method: "mxg_fleet_track.api.upload_zip",
    args: {
      doctype: frm.doctype,
      docname: frm.docname,
      filedata: base64,
      filename: name,
      is_private: 0
    },
    callback(r) {
      if (r.message) {
        // Set the misc_files Attach field to the new file's URL
        frm.set_value('misc_files', r.message.file_url);
        frm.save()
          .then(() => frappe.msgprint(__('ZIP uploaded and added to Misc Files.')))
          .catch(err => console.error(err));
      } else {
        frappe.msgprint(__('Upload failed.'));
      }
    },
    error(err) {
      frappe.msgprint(__('Error: ') + err.message);
      console.error(err);
    }
  });
}
