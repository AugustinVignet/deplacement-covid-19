import { PDFDocument, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

import './check-updates'
import './icons'
import { $, $$ } from './dom-utils'
import pdfBase from './attestation-de-deplacement-international-vers-om.pdf'

$('#radio-language-fr').addEventListener('click', async (event) => {
  window.location.href = './index.html'
})

const generateQR = async (text) => {
  try {
    const opts = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
    }
    return await QRCode.toDataURL(text, opts)
  } catch (err) {
    console.error(err)
  }
}

function saveProfile () {
  for (const field of $$('#form-profile input')) {
    localStorage.setItem(field.id.substring('field-'.length), field.value)
  }
}

function getProfile () {
  const fields = {}
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i)
    fields[name] = localStorage.getItem(name)
  }
  return fields
}

function idealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return textWidth > maxWidth ? null : currentSize
}

async function generatePdf (profile, typeNationality, reasons) {
  const creationDate = new Date().toLocaleDateString('fr-FR')
  const creationHour = new Date()
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h')

  const {
    lastname,
    firstname,
    birthday,
    nationality,
    address,
    zipcode,
    town,
    country,
  } = profile

  const data = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${birthday} (${nationality})`,
    `Adresse: ${address} ${zipcode} ${town} ${country}`,
    'Sortie: sans_objet',
    `Motifs: ${typeNationality}-${reasons}`,
  ].join(';\n ')

  const existingPdfBytes = await fetch(pdfBase).then((res) => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const page1 = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 9) => {
    page1.drawText(text, { x, y, size, font })
  }

  drawText(`${firstname} ${lastname}`, 125, 605)
  drawText(birthday, 125, 591)
  drawText(nationality, 125, 578)
  drawText(`${address} ${zipcode}`, 125, 566)
  drawText(`${town}, ${country}`, 125, 556)

  if (typeNationality === 'tiers') {
    if (reasons.includes('residence')) {
      drawText('x', 72, 506, 17)
    }
    if (reasons.includes('transit')) {
      drawText('x', 72, 481, 17)
    }
    if (reasons.includes('prof._sante')) {
      drawText('x', 72, 455, 17)
    }
    if (reasons.includes('marchandises')) {
      drawText('x', 72, 442, 17)
    }
    if (reasons.includes('equipage')) {
      drawText('x', 72, 430, 17)
    }
    if (reasons.includes('diplomatique')) {
      drawText('x', 72, 416, 17)
    }
    if (reasons.includes('frontalier')) {
      drawText('x', 72, 392, 17)
    }
  }

  if (typeNationality === 'eu') {
    if (reasons.includes('residence')) {
      drawText('x', 72, 357, 17)
    }
    if (reasons.includes('prof._sante')) {
      drawText('x', 72, 344, 17)
    }
    if (reasons.includes('marchandises')) {
      drawText('x', 72, 332, 17)
    }
    if (reasons.includes('equipage')) {
      drawText('x', 72, 319, 17)
    }
    if (reasons.includes('diplomatique')) {
      drawText('x', 72, 305, 17)
    }
    if (reasons.includes('sint-maarten')) {
      drawText('x', 72, 281, 17)
    }
  }
  if (typeNationality === 'fr') {
    drawText('x', 72, 246, 17)
  }
  let locationSize = idealFontSize(font, profile.town, 83, 7, 9)

  if (!locationSize) {
    alert(
      'Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. ' +
        'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.',
    )
    locationSize = 7
  }

  // Fait à :
  drawText(profile.town, 365, 208, locationSize)
  // Le
  drawText(
    `${new Date().toLocaleDateString('fr-FR', {
      month: 'numeric',
      day: 'numeric',
    })}`,
    479,
    207,
  )

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)

  page1.drawImage(qrImage, {
    x: 450,
    y: 572,
    width: 100,
    height: 100,
  })

  pdfDoc.addPage()
  const page2 = pdfDoc.getPages()[1]
  page2.drawImage(qrImage, {
    x: 50,
    y: page2.getHeight() - 350,
    width: 300,
    height: 300,
  })

  const pdfBytes = await pdfDoc.save()

  return new Blob([pdfBytes], { type: 'application/pdf' })
}

function downloadBlob (blob, fileName) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
}

function getAndSaveReasons () {
  const values = $$('input[name="field-reason"]:checked')
    .map((x) => x.value)
    .join('-')
  localStorage.setItem('reasons', values)
  return values
}

function getAndSaveTypeNationality () {
  const typeNationality = $$('input[name="field-type-nationality"]:checked')
    .map((x) => x.value)
    .join('-')
  localStorage.setItem('typeNationality', typeNationality)

  return typeNationality
}

// see: https://stackoverflow.com/a/32348687/1513045
function isFacebookBrowser () {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return ua.includes('FBAN') || ua.includes('FBAV')
}

if (isFacebookBrowser()) {
  $('#alert-facebook').value =
    "ATTENTION !! Vous utilisez actuellement le navigateur Facebook, ce générateur ne fonctionne pas correctement au sein de ce navigateur ! Merci d'ouvrir Chrome sur Android ou bien Safari sur iOS."
  $('#alert-facebook').classList.remove('d-none')
}

const birthdayInput = $('#field-birthday')
function addSlash () {
  birthdayInput.value = birthdayInput.value
    .replace(/^(\d{2})$/g, '$1/')
    .replace(/^(\d{2})\/(\d{2})$/g, '$1/$2/')
    .replace(/\/\//g, '/')
}

birthdayInput.onkeyup = function () {
  const key = event.keyCode || event.charCode
  if (key === 8 || key === 46) {
    return false
  } else {
    addSlash()
    return false
  }
}

const snackbar = $('#snackbar')

$('#generate-btn').addEventListener('click', async (event) => {
  event.preventDefault()

  saveProfile()
  const typeNationality = getAndSaveTypeNationality()
  let reasons
  if (typeNationality === 'fr') {
    reasons = 'sans_objet'
  } else {
    reasons = getAndSaveReasons()
  }

  const pdfBlob = await generatePdf(getProfile(), typeNationality, reasons)
  localStorage.clear()
  const creationDate = new Date().toLocaleDateString('fr-CA')
  const creationHour = new Date()
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', '-')
  downloadBlob(pdfBlob, `attestation-${creationDate}_${creationHour}.pdf`)

  snackbar.classList.remove('d-none')
  setTimeout(() => snackbar.classList.add('show'), 100)

  setTimeout(function () {
    snackbar.classList.remove('show')
    setTimeout(() => snackbar.classList.add('d-none'), 500)
  }, 6000)
})

$$('input').forEach((input) => {
  const exempleElt = input.parentNode.parentNode.querySelector('.exemple')
  if (input.placeholder && exempleElt) {
    input.addEventListener('input', (event) => {
      if (input.value) {
        exempleElt.innerHTML = 'ex.&nbsp;: ' + input.placeholder
      } else {
        exempleElt.innerHTML = ''
      }
    })
  }
})

const conditions = {
  '#field-firstname': {
    condition: 'length',
  },
  '#field-lastname': {
    condition: 'length',
  },
  '#field-birthday': {
    condition: 'pattern',
    pattern: /^([0][1-9]|[1-2][0-9]|30|31)\/([0][1-9]|10|11|12)\/(19[0-9][0-9]|20[0-1][0-9]|2020)/g,
  },
  '#field-nationality': {
    condition: 'length',
  },
  '#field-address': {
    condition: 'length',
  },
  '#field-town': {
    condition: 'length',
  },
  '#field-zipcode': {
    condition: 'lenght',
  },
  '#field-country': {
    condition: 'length',
  },
}

for (const fieldSelector of Object.keys(conditions)) {
  const field = $(fieldSelector)
  field.addEventListener('input', () => {
    const fieldCondition = conditions[field].condition
    if (fieldCondition === 'pattern') {
      const pattern = conditions[field].pattern
      const isAriaInvalid = field.value.match(pattern)
      field.setAttribute('aria-invalid', String(isAriaInvalid))
      return
    }
    if (fieldCondition === 'length') {
      const isAriaInvalid = field.value.length > 0
      field.setAttribute('aria-invalid', String(isAriaInvalid))
    }
  })
}

(function addVersion () {
  document.getElementById(
    'version',
  ).innerHTML = `${new Date().getFullYear()} - ${process.env.VERSION}`
})()
