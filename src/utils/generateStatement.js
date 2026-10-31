import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { format } from 'date-fns'
import { formatSachets } from './stock'

const BRAND = 'TEODORCAS'

function formatNaira(amount) {
  if (amount === null || amount === undefined) return 'N0'
  return 'N' + Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatDateShort(dateString) {
  return format(new Date(dateString), 'dd MMM yyyy')
}

function groupByDate(sales) {
  const groups = {}
  for (const sale of sales) {
    const key = new Date(sale.timestamp).toDateString()
    if (!groups[key]) groups[key] = { date: sale.timestamp, items: [] }
    groups[key].items.push(sale)
  }
  return Object.values(groups)
}

export function generateStatement(sales, startDate, endDate) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2

  // ─── HEADER BAR ───
  const headerHeight = 36
  doc.setFillColor(26, 86, 219)
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(BRAND, margin, 16)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Account Statement', margin, 24)

  // Orange accent line
  doc.setFillColor(249, 115, 22)
  doc.rect(0, headerHeight, pageWidth, 1.5, 'F')

  // ─── PERIOD & DATE INFO ───
  let y = headerHeight + 10
  doc.setTextColor(102, 102, 102)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const periodText = `Period: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
  doc.text(periodText, margin, y)

  const genText = `Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`
  const genWidth = doc.getTextWidth(genText)
  doc.text(genText, pageWidth - margin - genWidth, y)

  y += 10

  // ─── SUMMARY BOX ───
  const totalSold = sales.length
  const totalSachets = sales.reduce((sum, s) => sum + Number(s.sachets || 0), 0)
  const totalIncome = sales.reduce((sum, s) => sum + Number(s.final_amount), 0)
  const averageSale = totalSold > 0 ? totalIncome / totalSold : 0

  const summaryBoxHeight = 32
  doc.setFillColor(235, 242, 255)
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 3, 3, 'F')

  // Summary title
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 86, 219)
  doc.text('SUMMARY', margin + 6, y + 6)

  // Summary grid
  const colW = contentWidth / 3
  const summaryY = y + 14

  const summaryItems = [
    { label: 'Total Sales', value: String(totalSold) },
    { label: 'Sachets Sold', value: formatSachets(totalSachets) },
    { label: 'Total Income', value: formatNaira(totalIncome) },
  ]

  summaryItems.forEach((item, i) => {
    const x = margin + 6 + i * colW

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(102, 102, 102)
    doc.text(item.label, x, summaryY)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 86, 219)
    doc.text(item.value, x, summaryY + 8)
  })

  y += summaryBoxHeight + 12

  // ─── DETAILED STATEMENTS ───
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(51, 51, 51)
  doc.text('DETAILED STATEMENTS', margin, y)

  y += 2
  doc.setDrawColor(26, 86, 219)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)

  y += 6

  // ─── SALES TABLE BY DATE ───
  const grouped = groupByDate(sales)

  for (const group of grouped) {
    if (y > pageHeight - 40) {
      doc.addPage()
      y = 20
    }

    // Date sub-header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    doc.text(formatDateShort(group.date), margin, y)

    // Day subtotal on the right
    const dayTotal = group.items.reduce((sum, s) => sum + Number(s.final_amount), 0)
    const dayTotalText = `Day Total: ${formatNaira(dayTotal)}`
    const dayTotalWidth = doc.getTextWidth(dayTotalText)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(102, 102, 102)
    doc.text(dayTotalText, pageWidth - margin - dayTotalWidth, y)

    y += 4

    // Table body
    const tableBody = group.items.map(sale => [
      sale.drug_name,
      formatSachets(sale.sachets),
      formatNaira(sale.unit_price),
      formatNaira(sale.final_amount),
      format(new Date(sale.timestamp), 'hh:mm a'),
    ])

    // Day total row
    tableBody.push([
      { content: '', colSpan: 3 },
      { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatNaira(dayTotal), styles: { fontStyle: 'bold', textColor: [26, 86, 219] } },
    ])

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      head: [['Drug', 'Sachets', 'Unit Price', 'Amount', 'Time']],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: [51, 51, 51],
        lineColor: [230, 230, 230],
        lineWidth: 0.3,
        font: 'helvetica',
        overflow: 'ellipsize',
      },
      headStyles: {
        fillColor: [26, 86, 219],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 24, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fillColor = [235, 242, 255]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    y = doc.lastAutoTable.finalY + 8
  }

  // ─── GRAND TOTAL ───
  if (y > pageHeight - 50) {
    doc.addPage()
    y = 20
  }

  // Separator line
  doc.setDrawColor(26, 86, 219)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)

  y += 8

  const grandTotalItems = [
    { label: 'AVERAGE PER SALE', value: formatNaira(averageSale), bold: false, color: [102, 102, 102], size: 9 },
    { label: 'TOTAL INCOME', value: formatNaira(totalIncome), bold: true, color: [26, 86, 219], size: 12 },
  ]

  for (const item of grandTotalItems) {
    doc.setFontSize(item.size)
    doc.setFont('helvetica', item.bold ? 'bold' : 'normal')
    doc.setTextColor(...item.color)
    doc.text(item.label, margin + 2, y)
    const valueWidth = doc.getTextWidth(item.value)
    doc.text(item.value, pageWidth - margin - valueWidth, y)
    y += item.bold ? 7 : 6
  }

  y += 1
  doc.setDrawColor(26, 86, 219)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)

  // ─── FOOTER ───
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(153, 153, 153)
  doc.text(BRAND, margin, pageHeight - 12)
  doc.text('This is a computer-generated statement. No signature is required.', margin, pageHeight - 8)

  // ─── SAVE ───
  const filename = `${BRAND}_Statement_${formatDateShort(startDate).replace(/ /g, '-')}_to_${formatDateShort(endDate).replace(/ /g, '-')}.pdf`
  doc.save(filename)
}
