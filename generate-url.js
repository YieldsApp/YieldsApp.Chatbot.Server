const table = {
    "א": "%E0",
    "ב": "%E1",
    "ג": "%E2",
    "ד": "%E3",
    "ה": "%E4",
    "ו": "%E5",
    "ז": "%E6",
    "ח": "%E7",
    "ט": "%E8",
    "י": "%E9",
    "כ": "%EA",
    "ל": "%EB",
    "מ": "%EC",
    "נ": "%ED",
    "ס": "%EE",
    "ע": "%EF",
    "פ": "%F0",
    "צ": "%F1",
    "ק": "%F2",
    "ר": "%F3",
    "ש": "%F4",
    "ת": "%F5",
}

function generateUrl(tenderNumber) {
    tenderNumber = tenderNumber.substring(0, 7) + tenderNumber.slice(-2).split().map(a => table[a]).join('')
    return `http://apps.land.gov.il/PirsumMichrazim/Aspx/pirsumDetails.aspx?rc=1&tr=1&id=${tenderNumber}`
}

module.exports = generateUrl
