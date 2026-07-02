Attribute VB_Name = "Module1"
Option Explicit

' ============================================================================
' ICAI Financial Statement Tool - VBA add-on
'
' This module is NOT required for the workbook to work - the Trial Balance,
' Balance Sheet, Profit & Loss and Notes sheets are driven entirely by
' formulas. This module only adds one convenience: automatically importing a
' Tally Prime / Tally ERP "Trial Balance" export (a Group/Ledger tree, with
' Group subtotals and Ledgers mixed in one indented column) into the flat
' list the TB sheet's formulas expect.
'
' HOW TO INSTALL
'   1. Open this workbook in Excel, press Alt+F11 to open the VBA editor.
'   2. File -> Import File... and select this Module1.bas file.
'   3. Save the workbook as a Macro-Enabled Workbook (.xlsm).
'   4. (Optional) Developer tab -> Insert -> Button (Form Control), draw it
'      on the Home sheet, and assign it to ImportTallyTrialBalance.
'
' HOW TO USE
'   Run ImportTallyTrialBalance (Alt+F8 -> ImportTallyTrialBalance -> Run).
'   You will be prompted to pick the .xlsx file exported from Tally's Trial
'   Balance report. Existing rows on the TB sheet are cleared and replaced.
' ============================================================================

Private Const TB_FIRST_ROW As Long = 5
Private Const TB_MAX_ROW As Long = 504

Public Sub ImportTallyTrialBalance()
    Dim filePath As Variant
    filePath = Application.GetOpenFilename( _
        FileFilter:="Excel Files (*.xlsx;*.xls),*.xlsx;*.xls", _
        Title:="Select the Tally Trial Balance export")
    If filePath = False Then Exit Sub

    Dim srcWb As Workbook
    Application.ScreenUpdating = False
    On Error GoTo CleanFail
    Set srcWb = Workbooks.Open(filePath, ReadOnly:=True)

    Dim srcWs As Worksheet
    Set srcWs = srcWb.Worksheets(1)

    Dim headerRow As Long, debitCol As Long, creditCol As Long
    If Not FindDebitCreditHeader(srcWs, headerRow, debitCol, creditCol) Then
        MsgBox "Could not find a 'Debit'/'Credit' column header pair in this file." & vbCrLf & _
               "Please check it is a Tally Trial Balance export.", vbExclamation
        GoTo CleanExit
    End If
    Dim nameCol As Long
    nameCol = debitCol - 1
    If nameCol < 1 Then nameCol = 1

    ' ---- Read raw rows (name, indent, cyDebit, cyCredit) ----
    Dim rawNames() As String, rawIndent() As Long
    Dim rawDebit() As Double, rawCredit() As Double
    Dim rawCount As Long
    Dim lastRow As Long
    lastRow = srcWs.Cells(srcWs.Rows.Count, nameCol).End(xlUp).Row
    ReDim rawNames(1 To lastRow)
    ReDim rawIndent(1 To lastRow)
    ReDim rawDebit(1 To lastRow)
    ReDim rawCredit(1 To lastRow)
    rawCount = 0

    Dim r As Long, nm As String
    For r = headerRow + 1 To lastRow
        nm = Trim$(CStr(srcWs.Cells(r, nameCol).Value))
        If Len(nm) = 0 Then GoTo ContinueLoop
        If LCase$(nm) = "grand total" Then Exit For
        rawCount = rawCount + 1
        rawNames(rawCount) = nm
        rawIndent(rawCount) = srcWs.Cells(r, nameCol).IndentLevel
        rawDebit(rawCount) = ToNumber(srcWs.Cells(r, debitCol).Value)
        rawCredit(rawCount) = ToNumber(srcWs.Cells(r, creditCol).Value)
ContinueLoop:
    Next r

    srcWb.Close SaveChanges:=False
    Set srcWb = Nothing

    If rawCount = 0 Then
        MsgBox "No data rows were found below the header row.", vbExclamation
        GoTo CleanExit
    End If

    ' ---- Flatten the indent tree: Groups (rollups, arithmetically confirmed
    ' by their amount matching the sum of their children) are skipped;
    ' everything else is a leaf ledger, tagged with its nearest confirmed
    ' parent group name. ----
    Dim leafName() As String, leafGroup() As String
    Dim leafDebit() As Double, leafCredit() As Double
    Dim leafCount As Long
    ReDim leafName(1 To rawCount)
    ReDim leafGroup(1 To rawCount)
    ReDim leafDebit(1 To rawCount)
    ReDim leafCredit(1 To rawCount)
    leafCount = 0

    Dim nextIndex As Long
    ParseSiblings 1, -1, "", rawNames, rawIndent, rawDebit, rawCredit, rawCount, _
                  leafName, leafGroup, leafDebit, leafCredit, leafCount, nextIndex

    ' ---- Write into the TB sheet ----
    Dim tbWs As Worksheet
    Set tbWs = ThisWorkbook.Worksheets("TB")
    tbWs.Range(tbWs.Cells(TB_FIRST_ROW, 1), tbWs.Cells(TB_MAX_ROW, 9)).ClearContents

    If leafCount > TB_MAX_ROW - TB_FIRST_ROW + 1 Then
        MsgBox "This file has " & leafCount & " ledgers, more than the " & _
               (TB_MAX_ROW - TB_FIRST_ROW + 1) & " rows available on the TB sheet. " & _
               "Only the first " & (TB_MAX_ROW - TB_FIRST_ROW + 1) & " were imported.", vbExclamation
        leafCount = TB_MAX_ROW - TB_FIRST_ROW + 1
    End If

    Dim i As Long, outRow As Long
    For i = 1 To leafCount
        outRow = TB_FIRST_ROW + i - 1
        tbWs.Cells(outRow, 2).Value = leafName(i)          ' Ledger Name
        tbWs.Cells(outRow, 3).Value = leafGroup(i)          ' Tally Group hint
        If leafDebit(i) <> 0 Then tbWs.Cells(outRow, 6).Value = leafDebit(i)   ' CY Debit
        If leafCredit(i) <> 0 Then tbWs.Cells(outRow, 7).Value = leafCredit(i) ' CY Credit
    Next i

    Application.Calculate
    MsgBox "Imported " & leafCount & " ledger(s) from the Tally export." & vbCrLf & _
           "Review the 'Group' column on the TB sheet and correct any blanks.", vbInformation

CleanExit:
    Application.ScreenUpdating = True
    Exit Sub

CleanFail:
    Application.ScreenUpdating = True
    If Not srcWb Is Nothing Then srcWb.Close SaveChanges:=False
    MsgBox "Could not read this file: " & Err.Description, vbCritical
End Sub

' Recursively parses a run of sibling rows (all with indent > indentFloor),
' appending confirmed leaves to leafName/leafGroup/leafDebit/leafCredit.
' Mirrors src/lib/importTallyXlsx.ts::flattenTallyTree exactly.
Private Sub ParseSiblings(ByVal startIdx As Long, ByVal indentFloor As Long, ByVal parentName As String, _
    rawNames() As String, rawIndent() As Long, rawDebit() As Double, rawCredit() As Double, ByVal rawCount As Long, _
    leafName() As String, leafGroup() As String, leafDebit() As Double, leafCredit() As Double, _
    ByRef leafCount As Long, ByRef nextIdx As Long)

    Dim i As Long
    i = startIdx
    Do While i <= rawCount
        If rawIndent(i) <= indentFloor Then Exit Do

        Dim hasDeeperNext As Boolean
        hasDeeperNext = (i + 1 <= rawCount) And (rawIndent(i + 1) > rawIndent(i))

        If hasDeeperNext Then
            Dim childStart As Long
            childStart = leafCount + 1
            Dim childNextIdx As Long
            ParseSiblings i + 1, rawIndent(i), rawNames(i), rawNames, rawIndent, rawDebit, rawCredit, rawCount, _
                          leafName, leafGroup, leafDebit, leafCredit, leafCount, childNextIdx

            Dim sumDebit As Double, sumCredit As Double, j As Long
            sumDebit = 0: sumCredit = 0
            For j = childStart To leafCount
                sumDebit = sumDebit + leafDebit(j)
                sumCredit = sumCredit + leafCredit(j)
            Next j

            If ApproxEqual(sumDebit, rawDebit(i)) And ApproxEqual(sumCredit, rawCredit(i)) Then
                ' Confirmed rollup: children already appended, this row is dropped.
                i = childNextIdx
                GoTo ContinueLoop
            Else
                ' Not a real rollup - undo the speculative children, treat this
                ' row as its own leaf, and let the "children" be reprocessed as
                ' siblings at the current level.
                leafCount = childStart - 1
            End If
        End If

        leafCount = leafCount + 1
        leafName(leafCount) = rawNames(i)
        leafGroup(leafCount) = parentName
        leafDebit(leafCount) = rawDebit(i)
        leafCredit(leafCount) = rawCredit(i)
        i = i + 1
ContinueLoop:
    Loop
    nextIdx = i
End Sub

Private Function ApproxEqual(ByVal a As Double, ByVal b As Double) As Boolean
    Dim tolerance As Double
    tolerance = Application.WorksheetFunction.Max(1, Abs(b) * 0.005)
    ApproxEqual = (Abs(a - b) <= tolerance)
End Function

Private Function ToNumber(ByVal v As Variant) As Double
    If IsNumeric(v) Then
        ToNumber = CDbl(v)
    Else
        ToNumber = 0
    End If
End Function

' Scans the top of the sheet for the first row containing "Debit" immediately
' followed by "Credit" in the next column (Tally repeats this once per period
' column; we use the header row it appears on and that column pair).
Private Function FindDebitCreditHeader(ws As Worksheet, ByRef headerRow As Long, ByRef debitCol As Long, ByRef creditCol As Long) As Boolean
    Dim r As Long, c As Long
    Dim maxRow As Long, maxCol As Long
    maxRow = Application.WorksheetFunction.Min(40, ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 5)
    maxCol = 20

    FindDebitCreditHeader = False
    For r = 1 To maxRow
        For c = 1 To maxCol
            If LCase$(Trim$(CStr(ws.Cells(r, c).Value))) = "debit" Then
                If LCase$(Trim$(CStr(ws.Cells(r, c + 1).Value))) = "credit" Then
                    headerRow = r
                    debitCol = c
                    creditCol = c + 1
                    FindDebitCreditHeader = True
                    ' keep scanning - if a later (more rightward/lower) pair
                    ' exists (comparative trial balance), prefer the last one
                End If
            End If
        Next c
    Next r
End Function

' ---------------------------------------------------------------------------
' Exports the Balance Sheet, Profit & Loss and Notes sheets to a single PDF.
' ---------------------------------------------------------------------------
Public Sub ExportStatementsToPDF()
    Dim savePath As Variant
    savePath = Application.GetSaveAsFilename( _
        InitialFileName:=ThisWorkbook.Worksheets("Home").Range("C10").Value & " - Financial Statements.pdf", _
        FileFilter:="PDF Files (*.pdf), *.pdf")
    If savePath = False Then Exit Sub

    Dim sheetsToPrint As Variant
    sheetsToPrint = Array("BS", "PL", "Notes")
    ThisWorkbook.Sheets(sheetsToPrint).Select
    ThisWorkbook.ActiveSheet.ExportAsFixedFormat Type:=xlTypePDF, Filename:=savePath, _
        Quality:=xlQualityStandard, IncludeDocProperties:=True, IgnorePrintAreas:=False, OpenAfterPublish:=True
    ThisWorkbook.Worksheets("Home").Select
    MsgBox "Saved to " & savePath, vbInformation
End Sub
