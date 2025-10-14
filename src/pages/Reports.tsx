import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Subject {
  id: string;
  name: string;
}

interface ReportData {
  student_name: string;
  id_number: string;
  attendance_rate: number;
  average_grade: number;
}

const Reports = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [reportData, setReportData] = useState<ReportData[]>([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchReportData();
    }
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from("subjects").select("*");
    setSubjects(data || []);
  };

  const fetchReportData = async () => {
    const { data: students } = await supabase.from("students").select("*");
    const { data: attendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("subject_id", selectedSubject);
    const { data: grades } = await supabase
      .from("grades")
      .select("*")
      .eq("subject_id", selectedSubject);

    const reports: ReportData[] = (students || []).map((student) => {
      const studentAttendance = attendance?.filter((a) => a.student_id === student.id) || [];
      const attendanceRate =
        studentAttendance.length > 0
          ? (studentAttendance.filter((a) => a.present).length / studentAttendance.length) * 100
          : 0;

      const studentGrade = grades?.find((g) => g.student_id === student.id);
      const averageGrade = studentGrade ? Number(studentGrade.average) : 0;

      return {
        student_name: `${student.first_name} ${student.last_name}`,
        id_number: student.id_number,
        attendance_rate: attendanceRate,
        average_grade: averageGrade,
      };
    });

    setReportData(reports);
  };

  const getPerformanceBadge = (grade: number, attendance: number) => {
    if (grade >= 85 && attendance >= 90) return <Badge className="bg-success">Excellent</Badge>;
    if (grade >= 70 && attendance >= 80) return <Badge>Good</Badge>;
    if (grade < 70 || attendance < 70) return <Badge variant="destructive">Needs Attention</Badge>;
    return <Badge variant="secondary">Average</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reports</h1>
        <p className="text-muted-foreground">View comprehensive student performance reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Performance Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSubject && reportData.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Attendance Rate</TableHead>
                  <TableHead>Average Grade</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((report, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{report.id_number}</TableCell>
                    <TableCell>{report.student_name}</TableCell>
                    <TableCell>
                      <span
                        className={
                          report.attendance_rate >= 90
                            ? "text-success"
                            : report.attendance_rate >= 80
                            ? "text-primary"
                            : "text-destructive"
                        }
                      >
                        {report.attendance_rate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          report.average_grade >= 85
                            ? "text-success"
                            : report.average_grade >= 70
                            ? "text-primary"
                            : "text-destructive"
                        }
                      >
                        {report.average_grade.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getPerformanceBadge(report.average_grade, report.attendance_rate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;