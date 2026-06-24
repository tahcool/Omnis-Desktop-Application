const records = [
  {
    id: '7f0f74ad-45ab-477c-b080-d60a0270e812',
    name: 'eoleh96h0v',
    oem: 'Hitachi',
    model: 'ZX200 - 5G',
    proposed_order: 0,
    quantity: 1,
    production_completion: null,
    shipping_date: null,
    eta_durban: null,
    eta_beira: null,
    ted: null,
    eta_harare: '2026-04-23',
    contract: null,
    potential_customers: []
  }
];

const _stockCompanyMappings = [
  { brand: 'Hitachi', company: 'Machinery Exchange' },
  { brand: 'Sinotruk', company: 'Sinopower' }
];

const targetOem = 'all';
const targetStatus = 'All';
const targetCompany = 'All'; // try All
const targetContract = 'All';

// Simulation
const secOem = 'hitachi';

let companyMatch = true;
if (targetCompany !== 'All') {
    const mappedCompanyObj = _stockCompanyMappings.find(m => m.brand && m.brand.toLowerCase() === secOem);
    const mappedCompany = mappedCompanyObj ? mappedCompanyObj.company : null;
    if (mappedCompany !== targetCompany) {
        companyMatch = false;
    }
}

console.log("companyMatch for Hitachi when targetCompany is 'All':", companyMatch);
