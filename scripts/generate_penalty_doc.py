import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def create_document(output_path):
    doc = docx.Document()

    # Set margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles & Colors
    PRIMARY_COLOR = RGBColor(30, 41, 59)     # Slate 800
    ACCENT_COLOR = RGBColor(14, 116, 144)    # Cyan 700
    DANGER_COLOR = RGBColor(185, 28, 28)    # Red 700
    MUTED_COLOR = RGBColor(100, 116, 139)   # Slate 500

    def set_cell_shading(cell, color_hex):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    # Header / Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run_sub = p_title.add_run("TECHTABS BUSINESS SIMULATION | FACILITATOR REPORT\n")
    run_sub.font.size = Pt(9.5)
    run_sub.font.bold = True
    run_sub.font.color.rgb = ACCENT_COLOR

    run_title = p_title.add_run("Year 1 Price Gouging Audit & Max Revenue Penalty Calculation")
    run_title.font.size = Pt(20)
    run_title.font.bold = True
    run_title.font.color.rgb = PRIMARY_COLOR

    p_meta = doc.add_paragraph()
    p_meta.add_run("Class ID: ").bold = True
    p_meta.add_run("class_1795711242234  |  ").font.color.rgb = MUTED_COLOR
    p_meta.add_run("Class Name: ").bold = True
    p_meta.add_run("ADMP2603 ALP  |  ").font.color.rgb = MUTED_COLOR
    p_meta.add_run("Simulation Period: ").bold = True
    p_meta.add_run("Year 1 (Period 1)\n").font.color.rgb = MUTED_COLOR
    p_meta.add_run("Date of Audit: ").bold = True
    p_meta.add_run("28 November 2026\n").font.color.rgb = MUTED_COLOR

    # Horizontal divider
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(12)
    p_div_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="1" w:color="0E7490"/></w:pBdr>')
    p_div._p.get_or_add_pPr().append(p_div_border)

    # Executive Summary
    h1 = doc.add_heading("1. Executive Summary", level=1)
    h1.style.font.color.rgb = PRIMARY_COLOR
    h1.style.font.size = Pt(14)

    p1 = doc.add_paragraph(
        "During Year 1 of the ADMP2603 ALP simulation, teams had full flexibility over pricing across the three product segments: "
        "TechBook (Entry), Zroid (Mid), and iTab (Premium). Due to balanced multi-criteria customer buying weights, high retail prices "
        "did not sufficiently diminish market demand. To uphold realistic market constraints and penalize unconstrained price gouging, "
        "maximum retail price ceilings were established. All revenue generated above the allowed price thresholds is forfeited as a "
        "Max Revenue Penalty."
    )
    p1.paragraph_format.line_spacing = 1.15
    p1.paragraph_format.space_after = Pt(10)

    # Policy Ceiling Box
    p_policy = doc.add_paragraph()
    r_pol_title = p_policy.add_run("Established Price Ceilings:\n")
    r_pol_title.bold = True
    r_pol_title.font.size = Pt(11)
    p_policy.add_run("• TechBook (Entry Segment): ").bold = True
    p_policy.add_run("R 6,000 maximum retail price\n")
    p_policy.add_run("• Zroid (Mid Segment): ").bold = True
    p_policy.add_run("R 8,250 maximum retail price\n")
    p_policy.add_run("• iTab (Premium Segment): ").bold = True
    p_policy.add_run("R 11,850 maximum retail price\n")
    p_policy.paragraph_format.space_after = Pt(14)

    # Class Pricing Audit Table
    h2 = doc.add_heading("2. Class Pricing Audit (Year 1)", level=1)
    h2.style.font.color.rgb = PRIMARY_COLOR
    h2.style.font.size = Pt(14)

    table1 = doc.add_table(rows=1, cols=7)
    table1.alignment = WD_TABLE_ALIGNMENT.CENTER
    table1.autofit = False

    headers = ["Team Name", "Product", "Price Set", "Price Cap", "Excess / Unit", "Units Sold", "Status"]
    hdr_cells = table1.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_shading(hdr_cells[i], "1E293B")
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if i in [2, 3, 4, 5] else WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.bold = True
            run.font.size = Pt(8.5)
            run.font.color.rgb = RGBColor(255, 255, 255)

    data1 = [
        # Northbound
        ["Northbound", "TechBook", "R 3,000", "R 6,000", "R 0", "38,603", "Compliant"],
        ["Northbound", "Zroid", "R 6,000", "R 8,250", "R 0", "49,738", "Compliant"],
        ["Northbound", "iTab", "R 8,000", "R 11,850", "R 0", "26,922", "Compliant"],
        # Synergy
        ["Synergy", "TechBook", "R 1,000", "R 6,000", "R 0", "32,033", "Compliant"],
        ["Synergy", "Zroid", "R 4,500", "R 8,250", "R 0", "44,200", "Compliant"],
        ["Synergy", "iTab", "R 9,950", "R 11,850", "R 0", "20,002", "Compliant"],
        # The Hive
        ["The Hive", "TechBook", "R 4,500", "R 6,000", "R 0", "23,033", "Compliant"],
        ["The Hive", "Zroid", "R 7,200", "R 8,250", "R 0", "34,200", "Compliant"],
        ["The Hive", "iTab", "R 9,750", "R 11,850", "R 0", "16,500", "Compliant"],
        # Strategic Syndicate
        ["Strategic Syndicate", "TechBook", "R 2,900", "R 6,000", "R 0", "52,033", "Compliant"],
        ["Strategic Syndicate", "Zroid", "R 6,500", "R 8,250", "R 0", "74,200", "Compliant"],
        ["Strategic Syndicate", "iTab", "R 11,900", "R 11,850", "+R 50", "33,815", "BREACH"],
        # Collective IQ
        ["Collective IQ", "TechBook", "R 10,000", "R 6,000", "+R 4,000", "25,434", "BREACH"],
        ["Collective IQ", "Zroid", "R 14,000", "R 8,250", "+R 5,750", "43,642", "BREACH"],
        ["Collective IQ", "iTab", "R 18,000", "R 11,850", "+R 6,150", "25,352", "BREACH"],
    ]

    for row_idx, row_data in enumerate(data1):
        row = table1.add_row()
        is_breach = row_data[6] == "BREACH"
        bg_color = "FEF2F2" if is_breach else ("F8FAFC" if row_idx % 2 == 1 else "FFFFFF")
        
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_shading(cell, bg_color)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx in [2, 3, 4, 5] else WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.size = Pt(8.5)
                if is_breach:
                    r.font.bold = True
                    r.font.color.rgb = DANGER_COLOR if c_idx in [4, 6] else PRIMARY_COLOR

    p_sp1 = doc.add_paragraph()
    p_sp1.paragraph_format.space_before = Pt(12)

    # Detailed Penalty Breakdown by Product
    h3 = doc.add_heading("3. Penalty Calculation by Product for Affected Teams", level=1)
    h3.style.font.color.rgb = PRIMARY_COLOR
    h3.style.font.size = Pt(14)

    p_formula = doc.add_paragraph(
        "Penalty Formula Applied: \n"
        "Max Revenue Penalty = (Actual Price − Max Price Ceiling) × Actual Units Sold"
    )
    p_formula.runs[0].bold = True
    p_formula.paragraph_format.space_after = Pt(10)

    # Team 4 Detail
    h4_t4 = doc.add_heading("A. Team 4: Strategic Syndicate", level=2)
    h4_t4.style.font.color.rgb = PRIMARY_COLOR

    p_t4_desc = doc.add_paragraph(
        "Strategic Syndicate adhered to price caps on TechBook and Zroid, but set the iTab price at R 11,900, "
        "exceeding the R 11,850 threshold by R 50 per unit (+0.42%)."
    )
    p_t4_desc.paragraph_format.space_after = Pt(6)

    table_t4 = doc.add_table(rows=1, cols=7)
    table_t4.alignment = WD_TABLE_ALIGNMENT.CENTER
    t4_hdrs = ["Product", "Actual Price", "Price Cap", "Excess/Unit", "Units Sold", "Initial Revenue", "Penalty Amount"]
    for i, t in enumerate(t4_hdrs):
        c = table_t4.rows[0].cells[i]
        c.text = t
        set_cell_shading(c, "334155")
        set_cell_margins(c, top=100, bottom=100, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if i >= 1 else WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.bold = True
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(255, 255, 255)

    t4_rows = [
        ["TechBook", "R 2,900", "R 6,000", "R 0", "52,033", "R 150,895,700", "R 0"],
        ["Zroid", "R 6,500", "R 8,250", "R 0", "74,200", "R 482,300,000", "R 0"],
        ["iTab", "R 11,900", "R 11,850", "+R 50", "33,815", "R 402,398,500", "R 1,690,750"],
        ["TOTAL", "-", "-", "-", "160,048", "R 1,035,594,200", "R 1,690,750"],
    ]
    for r_idx, r_data in enumerate(t4_rows):
        row = table_t4.add_row()
        is_total = r_idx == len(t4_rows) - 1
        bg = "E2E8F0" if is_total else ("F8FAFC" if r_idx % 2 == 1 else "FFFFFF")
        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_shading(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx >= 1 else WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.size = Pt(8.5)
                if is_total:
                    r.font.bold = True
                if c_idx == 6 and val != "R 0":
                    r.font.bold = True
                    r.font.color.rgb = DANGER_COLOR

    p_sp2 = doc.add_paragraph()
    p_sp2.paragraph_format.space_before = Pt(12)

    # Team 5 Detail
    h4_t5 = doc.add_heading("B. Team 5: Collective IQ", level=2)
    h4_t5.style.font.color.rgb = PRIMARY_COLOR

    p_t5_desc = doc.add_paragraph(
        "Collective IQ engaged in extensive price gouging across all three product lines, pricing between 51% and 69% "
        "above allowable limits. The total excess revenue penalty across all products is R 508,592,300."
    )
    p_t5_desc.paragraph_format.space_after = Pt(6)

    table_t5 = doc.add_table(rows=1, cols=7)
    table_t5.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, t in enumerate(t4_hdrs):
        c = table_t5.rows[0].cells[i]
        c.text = t
        set_cell_shading(c, "334155")
        set_cell_margins(c, top=100, bottom=100, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if i >= 1 else WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.bold = True
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(255, 255, 255)

    t5_rows = [
        ["TechBook", "R 10,000", "R 6,000", "+R 4,000 (+66.7%)", "25,434", "R 254,340,000", "R 101,736,000"],
        ["Zroid", "R 14,000", "R 8,250", "+R 5,750 (+69.7%)", "43,642", "R 610,988,000", "R 250,941,500"],
        ["iTab", "R 18,000", "R 11,850", "+R 6,150 (+51.9%)", "25,352", "R 456,336,000", "R 155,914,800"],
        ["TOTAL", "-", "-", "-", "94,428", "R 1,321,664,000", "R 508,592,300"],
    ]
    for r_idx, r_data in enumerate(t5_rows):
        row = table_t5.add_row()
        is_total = r_idx == len(t5_rows) - 1
        bg = "E2E8F0" if is_total else ("F8FAFC" if r_idx % 2 == 1 else "FFFFFF")
        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_shading(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx >= 1 else WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.size = Pt(8.5)
                if is_total:
                    r.font.bold = True
                if c_idx == 6:
                    r.font.bold = True
                    r.font.color.rgb = DANGER_COLOR

    p_sp3 = doc.add_paragraph()
    p_sp3.paragraph_format.space_before = Pt(14)

    # Financial Statements & Income Statement Integration
    h4 = doc.add_heading("4. Financial Statement Integration (Before vs. After Penalty)", level=1)
    h4.style.font.color.rgb = PRIMARY_COLOR
    h4.style.font.size = Pt(14)

    p_fs_desc = doc.add_paragraph(
        "As instructed, a new expense line item 'Max Revenue Penalty' has been inserted into the Income Statement "
        "immediately below Total Gross Profit and directly before Operating Expenses. The penalty is deducted from EBITDA, "
        "lowering taxable profit (EBT), taxation, net profit, closing cash, and shareholders' equity."
    )
    p_fs_desc.paragraph_format.space_after = Pt(8)

    table_fs = doc.add_table(rows=1, cols=6)
    table_fs.alignment = WD_TABLE_ALIGNMENT.CENTER
    fs_hdrs = ["Financial Metric", "Strategic Syndicate (Before)", "Strategic Syndicate (After)", "Collective IQ (Before)", "Collective IQ (After)", "Accounting Impact"]
    for i, t in enumerate(fs_hdrs):
        c = table_fs.rows[0].cells[i]
        c.text = t
        set_cell_shading(c, "1E293B")
        set_cell_margins(c, top=100, bottom=100, left=90, right=90)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if i in [1, 2, 3, 4] else WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.bold = True
            r.font.size = Pt(8)
            r.font.color.rgb = RGBColor(255, 255, 255)

    fs_data = [
        ["Total Revenue", "R 1,035,594,200", "R 1,035,594,200", "R 1,321,664,000", "R 1,321,664,000", "Reported initial gross revenue"],
        ["Cost of Sales (COGS)", "R 267,564,055", "R 267,564,055", "R 186,360,255", "R 186,360,255", "Direct manufacturing cost"],
        ["Gross Profit (GP)", "R 768,030,145", "R 768,030,145", "R 1,135,303,745", "R 1,135,303,745", "Revenue − COGS"],
        ["Max Revenue Penalty", "R 0", "R 1,690,750", "R 0", "R 508,592,300", "NEW LINE ITEM (Expense)"],
        ["Operating Expenses (OpEx)", "R 362,458,477", "R 362,458,477", "R 257,928,383", "R 257,928,383", "Marketing, Stores, Payroll, R&D"],
        ["EBITDA", "R 405,571,668", "R 403,880,918", "R 877,375,362", "R 368,783,062", "GP − Penalty − OpEx"],
        ["Depreciation & Finance", "R 1,535,965", "R 1,535,965", "R 1,535,965", "R 1,535,965", "Fixed plant & debt service"],
        ["Profit Before Tax (EBT)", "R 404,035,703", "R 402,344,953", "R 875,839,397", "R 367,247,097", "EBITDA − Depr − Finance"],
        ["Taxation (28%)", "R 113,130,000", "R 112,656,587", "R 245,235,031", "R 102,829,187", "Corporate income tax @ 28%"],
        ["Net Profit for Period", "R 290,905,706", "R 289,688,366", "R 630,604,366", "R 264,417,910", "Bottom-line net earnings"],
        ["Closing Cash Balance", "R 226,418,236", "R 225,200,896", "R 527,315,263", "R 161,128,807", "Year 1 Cash / Year 2 Opening Cash"],
        ["Shareholders' Equity", "R 631,955,776", "R 630,738,436", "R 971,654,436", "R 605,467,980", "Year 1 Equity / Year 2 Opening Equity"],
    ]

    for r_idx, r_data in enumerate(fs_data):
        row = table_fs.add_row()
        is_highlight = r_data[0] in ["Max Revenue Penalty", "Net Profit for Period", "Closing Cash Balance"]
        bg = "FEF3C7" if r_data[0] == "Max Revenue Penalty" else ("EFF6FF" if is_highlight else ("F8FAFC" if r_idx % 2 == 1 else "FFFFFF"))
        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_shading(cell, bg)
            set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx in [1, 2, 3, 4] else WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.size = Pt(8)
                if is_highlight:
                    r.font.bold = True
                if r_data[0] == "Max Revenue Penalty" and c_idx in [2, 4]:
                    r.font.color.rgb = DANGER_COLOR

    p_sp4 = doc.add_paragraph()
    p_sp4.paragraph_format.space_before = Pt(14)

    # Class Marks Impact
    h5 = doc.add_heading("5. Impact on Group Marks & Rankings", level=1)
    h5.style.font.color.rgb = PRIMARY_COLOR
    h5.style.font.size = Pt(14)

    p_marks_desc = doc.add_paragraph(
        "In compliance with the marks mandate, all revenue-derived metrics in the grading engine have been adjusted by the penalty:\n"
        "• Adjusted Revenue = Initial Revenue − Max Revenue Penalty\n"
        "• Cost of Sales % = Total COGS ÷ Adjusted Revenue (COS% increases, reducing Gross Profit %)\n"
        "• Net Profit % = Adjusted Net Profit ÷ Adjusted Revenue\n"
        "• Accumulated Revenue (accRevenue) uses the net adjusted revenue for ranking.\n"
        "Both initial revenue and penalty are preserved in the facilitator portal so teams see the full pedagogical consequence."
    )
    p_marks_desc.paragraph_format.space_after = Pt(8)

    table_m = doc.add_table(rows=1, cols=6)
    table_m.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_hdrs = ["Team Name", "Initial Revenue", "Revenue Penalty", "Adjusted Revenue", "Effective COS %", "Final Mark (Year 1)"]
    for i, t in enumerate(m_hdrs):
        c = table_m.rows[0].cells[i]
        c.text = t
        set_cell_shading(c, "0F172A")
        set_cell_margins(c, top=100, bottom=100, left=90, right=90)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if i >= 1 else WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.bold = True
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(255, 255, 255)

    m_data = [
        ["Northbound", "R 629,613,000", "R 0", "R 629,613,000", "31.4%", "64 / 100"],
        ["Synergy", "R 429,952,900", "R 0", "R 429,952,900", "42.9%", "47 / 100"],
        ["The Hive", "R 510,763,500", "R 0", "R 510,763,500", "27.8%", "57 / 100"],
        ["Strategic Syndicate", "R 1,035,594,200", "R 1,690,750", "R 1,033,903,450", "25.9%", "77 / 100 (+2)"],
        ["Collective IQ", "R 1,321,664,000", "R 508,592,300", "R 813,071,700", "22.9% (was 14.1%)", "73 / 100 (-2)"],
    ]

    for r_idx, r_data in enumerate(m_data):
        row = table_m.add_row()
        is_breach = r_data[2] != "R 0"
        bg = "FEF2F2" if is_breach else ("F8FAFC" if r_idx % 2 == 1 else "FFFFFF")
        for c_idx, val in enumerate(r_data):
            cell = row.cells[c_idx]
            cell.text = val
            set_cell_shading(cell, bg)
            set_cell_margins(cell, top=80, bottom=80, left=90, right=90)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if c_idx >= 1 else WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                r.font.size = Pt(8.5)
                if is_breach and c_idx in [2, 5]:
                    r.font.bold = True
                    r.font.color.rgb = DANGER_COLOR

    p_sp5 = doc.add_paragraph()
    p_sp5.paragraph_format.space_before = Pt(14)

    # Conclusion & Sign-off
    h6 = doc.add_heading("6. Implementation & Verification Status", level=1)
    h6.style.font.color.rgb = PRIMARY_COLOR
    h6.style.font.size = Pt(14)

    p_sign = doc.add_paragraph(
        "• Codebase Updates: Completed across industryPerformance.ts, SimulationEngine.ts, MarketReports.tsx, FinancialReports.tsx, marksEngine.ts, and GroupMarks.tsx.\n"
        "• Database Patch: Applied directly to Cloud Firestore for class class_1795711242234. Strategic Syndicate and Collective IQ now reflect their adjusted Net Profit, Cash, and Year 2 opening balances.\n"
        "• Regression Tests: All unit tests, CAPEX tests, and reproduction tests passed with 100% compliance.\n\n"
        "Report prepared by: Simulation Administrator & Technical Team\n"
        "Approved for: Class ADMP2603 ALP"
    )
    p_sign.runs[0].font.size = Pt(9.5)
    p_sign.runs[0].font.color.rgb = PRIMARY_COLOR

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    doc.save(output_path)
    print(f"Document saved successfully at: {output_path}")

if __name__ == "__main__":
    out_file = "/Users/briansimelane/Desktop/Products2026/TechtabsOnlinev2/Year_1_Price_Gouging_Penalty_Report_class_1795711242234.docx"
    create_document(out_file)
