import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PatientPDFData {
  patientName: string;
  memberId: string;
  dateOfBirth: string;
  searchDate: string;
  eligibilityData: any;
  coverageData?: any;
  memberCardData?: any;
}

export class PDFGenerator {
  private static readonly MARGIN = 20;
  private static readonly LINE_HEIGHT = 6;
  private static readonly SECTION_SPACING = 12;
  private static readonly TABLE_ROW_HEIGHT = 8;
  private static readonly PAGE_WIDTH = 210;
  private static readonly PAGE_HEIGHT = 297;

  static async generatePatientReport(data: PatientPDFData): Promise<void> {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPos = this.MARGIN;

      // Add header
      yPos = this.addHeader(pdf, yPos);
      
      // Add member card if available
      if (data.memberCardData?.imageData) {
        yPos = await this.addMemberCard(pdf, data.memberCardData, yPos);
      }

      // Add patient demographics
      yPos = this.addPatientDemographics(pdf, data, yPos);

      // Add insurance information
      yPos = this.addInsuranceInformation(pdf, data, yPos);

      // Add policy information
      yPos = this.addPolicyInformation(pdf, data, yPos);

      // Add deductible information
      yPos = this.addDeductibleInformation(pdf, data, yPos);

      // Add out-of-pocket information
      yPos = this.addOutOfPocketInformation(pdf, data, yPos);

      // Add coverage details
      yPos = this.addCoverageDetails(pdf, data, yPos);

      // Add primary care physician
      yPos = this.addPrimaryCarePhysician(pdf, data, yPos);

      // Add footer
      this.addFooter(pdf);

      // Save the PDF
      const filename = `${data.patientName.replace(/\s+/g, '_')}_Eligibility_Report.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  private static addHeader(pdf: jsPDF, yPos: number): number {
    // Main title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('UHC Patient Eligibility Report', this.PAGE_WIDTH / 2, yPos, { align: 'center' });
    
    yPos += this.SECTION_SPACING * 2;

    // Generation date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, this.PAGE_WIDTH / 2, yPos, { align: 'center' });
    
    return yPos + this.SECTION_SPACING * 2;
  }

  private static async addMemberCard(pdf: jsPDF, memberCardData: any, yPos: number): Promise<number> {
    try {
      if (memberCardData.imageData) {
        // Check if we need a new page
        if (yPos > this.PAGE_HEIGHT - 80) {
          pdf.addPage();
          yPos = this.MARGIN;
        }

        // Section title
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Member Card', this.MARGIN, yPos);
        yPos += this.SECTION_SPACING;

        // Convert image data to base64
        const base64Data = btoa(Array.from(memberCardData.imageData, (byte: number) => String.fromCharCode(byte)).join(''));
        const imgData = `data:${memberCardData.contentType || 'image/png'};base64,${base64Data}`;

        // Add image (scaled to fit nicely)
        const imgWidth = 80;
        const imgHeight = 50;
        const imgX = (this.PAGE_WIDTH - imgWidth) / 2;
        
        pdf.addImage(imgData, 'PNG', imgX, yPos, imgWidth, imgHeight);
        yPos += imgHeight + this.SECTION_SPACING;
      }
    } catch (error) {
      console.error('Error adding member card to PDF:', error);
      // Continue without the image
    }
    
    return yPos;
  }

  private static addPatientDemographics(pdf: jsPDF, data: PatientPDFData, yPos: number): number {
    const policy = data.eligibilityData?.memberPolicies?.[0];
    const patientInfo = policy?.patientInfo?.[0];
    const insuranceInfo = policy?.insuranceInfo;

    // Check if we need a new page
    if (yPos > this.PAGE_HEIGHT - 100) {
      pdf.addPage();
      yPos = this.MARGIN;
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Patient Demographics', this.MARGIN, yPos);
    yPos += this.SECTION_SPACING;

    // Create table data
    const tableData = [
      ['Full Name', data.patientName || 'N/A'],
      ['Date of Birth', this.formatDate(patientInfo?.dateOfBirth) || 'N/A'],
      ['Gender', patientInfo?.gender || 'N/A'],
      ['Member ID', insuranceInfo?.memberId || 'N/A'],
      ['Relationship', patientInfo?.relationship || 'N/A'],
      ['Subscriber', patientInfo?.subscriberBoolean ? 'Yes' : 'No']
    ];

    // Add address if available
    if (patientInfo?.addressLine1) {
      const address = [
        patientInfo.addressLine1,
        patientInfo.addressLine2 ? patientInfo.addressLine2 : '',
        `${patientInfo.city || ''}, ${patientInfo.state || ''} ${patientInfo.zip || ''}`
      ].filter(line => line.trim()).join('\n');
      
      tableData.push(['Address', address]);
    }

    yPos = this.addTable(pdf, tableData, yPos);
    return yPos + this.SECTION_SPACING;
  }

  private static addInsuranceInformation(pdf: jsPDF, data: PatientPDFData, yPos: number): number {
    const policy = data.eligibilityData?.memberPolicies?.[0];
    const insuranceInfo = policy?.insuranceInfo;

    if (!insuranceInfo) return yPos;

    // Check if we need a new page
    if (yPos > this.PAGE_HEIGHT - 80) {
      pdf.addPage();
      yPos = this.MARGIN;
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Insurance Information', this.MARGIN, yPos);
    yPos += this.SECTION_SPACING;

    const tableData = [
      ['Payer Name', insuranceInfo.payerName || 'N/A'],
      ['Plan Description', insuranceInfo.planDescription || 'N/A'],
      ['Group Number', insuranceInfo.groupNumber || 'N/A'],
      ['Insurance Type', insuranceInfo.insuranceType || 'N/A'],
      ['Line of Business', insuranceInfo.lineOfBusiness || 'N/A'],
      ['Payer ID', insuranceInfo.payerId || 'N/A']
    ];

    yPos = this.addTable(pdf, tableData, yPos);
    return yPos + this.SECTION_SPACING;
  }

  private static addPolicyInformation(pdf: jsPDF, data: PatientPDFData, yPos: number): number {
    const policy = data.eligibilityData?.memberPolicies?.[0];
    const policyInfo = policy?.policyInfo;

    if (!policyInfo) return yPos;

    // Check if we need a new page
    if (yPos > this.PAGE_HEIGHT - 60) {
      pdf.addPage();
      yPos = this.MARGIN;
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Policy Information', this.MARGIN, yPos);
    yPos += this.SECTION_SPACING;

    const tableData = [
      ['Policy Status', policyInfo.policyStatus || 'N/A'],
      ['Coverage Type', policyInfo.coverageType || 'N/A']
    ];

    if (policyInfo.eligibilityDates) {
      const startDate = this.formatDate(policyInfo.eligibilityDates.startDate);
      const endDate = this.formatDate(policyInfo.eligibilityDates.endDate);
      tableData.push(['Eligibility Period', `${startDate} - ${endDate}`]);
    }

    yPos = this.addTable(pdf, tableData, yPos);
    return yPos + this.SECTION_SPACING;
  }

  private static addDeductibleInformation(pdf: jsPDF, data: PatientPDFData, yPos: number): number {
    const policy = data.eligibilityData?.memberPolicies?.[0];
    const deductibleInfo = policy?.deductibleInfo;

    if (!deductibleInfo?.found) return yPos;

    // Check if we need a new page
    if (yPos > this.PAGE_HEIGHT - 100) {
      pdf.addPage();
      yPos = this.MARGIN;
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Deductible Information', this.MARGIN, yPos);
    yPos += this.SECTION_SPACING;

    // Create table headers
    const headers = ['Type', 'Plan Amount', 'Remaining', 'Met YTD'];
    const tableData: string[][] = [];

    // Add individual deductible data
    if (deductibleInfo.individual?.found) {
      if (deductibleInfo.individual.inNetwork?.found) {
        const inNetwork = deductibleInfo.individual.inNetwork;
        tableData.push([
          'Individual In-Network',
          `$${inNetwork.planAmount || '0'}`,
          `$${inNetwork.remainingAmount || '0'}`,
          `$${inNetwork.metYtdAmount || '0'}`
        ]);
      }
      if (deductibleInfo.individual.outOfNetwork?.found) {
        const outOfNetwork = deductibleInfo.individual.outOfNetwork;
        tableData.push([
          'Individual Out-of-Network',
          `$${outOfNetwork.planAmount || '0'}`,
          `$${outOfNetwork.remainingAmount || '0'}`,
          `$${outOfNetwork.metYtdAmount || '0'}`
        ]);
      }
    }

    // Add family deductible data
    if (deductibleInfo.family?.found) {
      if (deductibleInfo.family.inNetwork?.found) {
        const inNetwork = deductibleInfo.family.inNetwork;
        tableData.push([
          'Family In-Network',
          `$${inNetwork.planAmount || '0'}`,
          `$${inNetwork.remainingAmount || '0'}`,
          `$${inNetwork.metYtdAmount || '0'}`
        ]);
      }
      if (deductibleInfo.family.outOfNetwork?.found) {
        const outOfNetwork = deductibleInfo.family.outOfNetwork;
        tableData.push([
          'Family Out-of-Network',
          `$${outOfNetwork.planAmount || '0'}`,
          `$${outOfNetwork.remainingAmount || '0'}`,
          `$${outOfNetwork.metYtdAmount || '0'}`
        ]);
      }
    }

    if (tableData.length > 0) {
      yPos = this.addTableWithHeaders(pdf, headers, tableData, yPos);
    }

    return yPos + this.SECTION_SPACING;
  }

  private static addOutOfPocketInformation(pdf: jsPDF, data: PatientPDFData, yPos: number): number {
    const policy = data.eligibilityData?.memberPolicies?.[0];
    const outOfPocketInfo = policy?.outOfPocketInfo;

    if (!outOfPocketInfo?.found) return yPos;

    // Check if we need a new page
    if (yPos > this.PAGE_HEIGHT - 100) {
      pdf.addPage();
      yPos = this.MARGIN;
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Out-of-Pocket Information', this.MARGIN, yPos);
    yPos += this.SECTION_SPACING;

    const headers = ['Type', 'Plan Amount', 'Remaining', 'Met YTD'];
    const tableData: string[][] = [];

    // Add individual out-of-pocket data
    if (outOfPocketInfo.individual?.found) {
      if (outOfPocketInfo.individual.inNetwork?.found) {
        const inNetwork = outOfPocketInfo.individual.inNetwork;
        tableData.push([
          'Individual In-Network',
          `$${inNetwork.planAmount || '0'}`,
          `$${inNetwork.remainingAmount || '0'}`,
          `$${inNetwork.metYtdAmount || '0'}`
        ]);
      }
      if (outOfPocketInfo.individual.outOfNetwork?.found) {
        const outOfNetwork = outOfPocketInfo.individual.outOfNetwork;
        tableData.push([
          'Individual Out-of-Network',
          `$${outOfNetwork.planAmount || '0'}`,
          `$${outOfNetwork.remainingAmount || '0'}`,
          `$${outOfNetwork.metYtdAmount || '0'}`
        ]);
      }
    }

    // Add family out-of-pocket data
    if (outOfPocketInfo.family?.found) {
      if (outOfPocketInfo.family.inNetwork?.found) {
        const inNetwork = outOfPocketInfo.family.inNetwork;
        tableData.push([
          'Family In-Network',
          `$${inNetwork.planAmount || '0'}`,
          `$${inNetwork.remainingAmount || '0'}`,
          `$${inNetwork.metYtdAmount || '0'}`
        ]);
      }
      if (outOfPocketInfo.family.outOfNetwork?.found) {
        const outOfNetwork = outOfPocketInfo.family.outOfNetwork;
        tableData.push([
          'Family Out-of-Network',
          `$${outOfNetwork.planAmount || '0'}`,
          `$${outOfNetwork.remainingAmount || '0'}`,
          `$${outOfNetwork.metYtdAmount || '0'}`
        ]);
      }
    }

    if (tableData.length > 0) {
      yPos = this.addTableWithHeaders(pdf, headers, tableData, yPos);
    }

    return yPos + this.SECTION_SPACING;
  }

  private static addCoverageDetails(pdf: jsPDF, data: PatientPDFData, yPos: number): number {
    const coverage = data.coverageData;
    const services = coverage?.CopayCoInsuranceDetails?.individual?.inNetwork?.services;

    if (!services || !Array.isArray(services)) return yPos;

    const activeServices = services.filter((service: any) => service.found);
    if (activeServices.length === 0) return yPos;

    // Check if we need a new page
    if (yPos > this.PAGE_HEIGHT - 100) {
      pdf.addPage();
      yPos = this.MARGIN;
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Coverage Details - In-Network Services', this.MARGIN, yPos);
    yPos += this.SECTION_SPACING;

    const headers = ['Service', 'Status', 'Copay', 'Coinsurance'];
    const tableData: string[][] = [];

    activeServices.forEach((service: any) => {
      tableData.push([
        service.text || service.service || 'N/A',
        service.status || 'N/A',
        `$${service.coPayAmount || '0'}`,
        `${service.coInsurancePercent || '0'}%`
      ]);
    });

    if (tableData.length > 0) {
      yPos = this.addTableWithHeaders(pdf, headers, tableData, yPos);
    }

    return yPos + this.SECTION_SPACING;
  }

  private static addPrimaryCarePhysician(pdf: jsPDF, data: PatientPDFData, yPos: number): number {
    const policy = data.eligibilityData?.memberPolicies?.[0];
    const pcpInfo = policy?.primaryCarePhysicianInfo;

    if (!pcpInfo || pcpInfo.pcpFound !== 'true') return yPos;

    // Check if we need a new page
    if (yPos > this.PAGE_HEIGHT - 60) {
      pdf.addPage();
      yPos = this.MARGIN;
    }

    // Section title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Primary Care Physician', this.MARGIN, yPos);
    yPos += this.SECTION_SPACING;

    const physicianName = `${pcpInfo.firstName || ''} ${pcpInfo.middleName || ''} ${pcpInfo.lastName || ''}`.trim() || 'N/A';
    const networkStatus = pcpInfo.networkStatusCode === 'I' ? 'In-Network' : 'Out-of-Network';

    const tableData = [
      ['Physician Name', physicianName],
      ['Provider Group', pcpInfo.providerGroupName || 'N/A'],
      ['Network Status', networkStatus]
    ];

    yPos = this.addTable(pdf, tableData, yPos);
    return yPos + this.SECTION_SPACING;
  }

  private static addTable(pdf: jsPDF, data: string[][], yPos: number): number {
    const colWidth = (this.PAGE_WIDTH - 2 * this.MARGIN) / 2;
    
    data.forEach((row) => {
      // Check if we need a new page
      if (yPos > this.PAGE_HEIGHT - 20) {
        pdf.addPage();
        yPos = this.MARGIN;
      }

      // Label (bold)
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(row[0], this.MARGIN, yPos);

      // Value (normal)
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(row[1], colWidth);
      pdf.text(lines, this.MARGIN + colWidth, yPos);

      yPos += this.TABLE_ROW_HEIGHT * Math.max(1, lines.length);
    });

    return yPos;
  }

  private static addTableWithHeaders(pdf: jsPDF, headers: string[], data: string[][], yPos: number): number {
    const colWidth = (this.PAGE_WIDTH - 2 * this.MARGIN) / headers.length;

    // Check if we need a new page
    if (yPos > this.PAGE_HEIGHT - (data.length + 2) * this.TABLE_ROW_HEIGHT) {
      pdf.addPage();
      yPos = this.MARGIN;
    }

    // Draw headers
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    headers.forEach((header, index) => {
      pdf.text(header, this.MARGIN + index * colWidth, yPos);
    });
    yPos += this.TABLE_ROW_HEIGHT;

    // Draw separator line
    pdf.line(this.MARGIN, yPos - 2, this.PAGE_WIDTH - this.MARGIN, yPos - 2);
    yPos += 2;

    // Draw data rows
    pdf.setFont('helvetica', 'normal');
    data.forEach((row) => {
      // Check if we need a new page
      if (yPos > this.PAGE_HEIGHT - 20) {
        pdf.addPage();
        yPos = this.MARGIN;
        
        // Redraw headers on new page
        pdf.setFont('helvetica', 'bold');
        headers.forEach((header, index) => {
          pdf.text(header, this.MARGIN + index * colWidth, yPos);
        });
        yPos += this.TABLE_ROW_HEIGHT;
        pdf.line(this.MARGIN, yPos - 2, this.PAGE_WIDTH - this.MARGIN, yPos - 2);
        yPos += 2;
        pdf.setFont('helvetica', 'normal');
      }

      row.forEach((cell, index) => {
        const lines = pdf.splitTextToSize(cell, colWidth - 5);
        pdf.text(lines, this.MARGIN + index * colWidth, yPos);
      });
      yPos += this.TABLE_ROW_HEIGHT;
    });

    return yPos;
  }

  private static addFooter(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      // Page number
      pdf.text(`Page ${i} of ${pageCount}`, this.PAGE_WIDTH - this.MARGIN, this.PAGE_HEIGHT - 10, { align: 'right' });
      
      // Disclaimer
      pdf.text('This report is confidential and intended for authorized use only.', this.MARGIN, this.PAGE_HEIGHT - 10);
    }
  }

  private static formatDate(dateString: string): string {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US');
    } catch {
      return dateString;
    }
  }

  // Legacy methods for backward compatibility
  static async generateFromElement(elementId: string, filename: string): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('PDF generation from element error:', error);
      throw new Error('Failed to generate PDF from element');
    }
  }

  static printElement(elementId: string): void {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found');
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Patient Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .print-header { text-align: center; margin-bottom: 30px; }
              .print-section { margin-bottom: 20px; }
              .print-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .print-table th { background-color: #f2f2f2; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      console.error('Print error:', error);
      throw new Error('Failed to print element');
    }
  }
}