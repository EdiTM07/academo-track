import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  student_id: string;
  partial_score: number;
  exam_score: number;
  average: number;
  students: Student;
}

const Grades = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [grades, setGrades] = useState<Record<string, { partial: string; exam: string }>>({});
  const [existingGrades, setExistingGrades] = useState<Grade[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchGrades();
    }
  }, [selectedSubject]);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("last_name", { ascending: true });
    setStudents(data || []);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase.from("subjects").select("*");
    setSubjects(data || []);
  };

  const fetchGrades = async () => {
    const { data } = await supabase
      .from("grades")
      .select("*, students(*)")
      .eq("subject_id", selectedSubject);

    setExistingGrades(data || []);

    const gradesMap: Record<string, { partial: string; exam: string }> = {};
    data?.forEach((grade) => {
      gradesMap[grade.student_id] = {
        partial: grade.partial_score.toString(),
        exam: grade.exam_score.toString(),
      };
    });
    setGrades(gradesMap);
  };

  const handleGradeChange = (studentId: string, field: "partial" | "exam", value: string) => {
    setGrades({
      ...grades,
      [studentId]: {
        ...grades[studentId],
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      toast({ title: "Error", description: "Please select a subject", variant: "destructive" });
      return;
    }

    try {
      const records = Object.entries(grades).map(([studentId, scores]) => ({
        student_id: studentId,
        subject_id: selectedSubject,
        partial_score: parseFloat(scores.partial) || 0,
        exam_score: parseFloat(scores.exam) || 0,
      }));

      const { error } = await supabase.from("grades").upsert(records, {
        onConflict: "student_id,subject_id",
      });

      if (error) throw error;

      toast({ title: "Success", description: "Grades saved successfully" });
      fetchGrades();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getAverageBadge = (average: number) => {
    if (average >= 90) return <Badge className="bg-success">Excellent</Badge>;
    if (average >= 80) return <Badge>Good</Badge>;
    if (average >= 70) return <Badge variant="secondary">Average</Badge>;
    return <Badge variant="destructive">Below Average</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Grades</h1>
        <p className="text-muted-foreground">Manage student grades and performance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Grades</CardTitle>
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

          {selectedSubject && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Partial Score</TableHead>
                    <TableHead>Exam Score</TableHead>
                    <TableHead>Average</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const partial = parseFloat(grades[student.id]?.partial || "0");
                    const exam = parseFloat(grades[student.id]?.exam || "0");
                    const average = (partial + exam) / 2;

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.id_number}</TableCell>
                        <TableCell>{`${student.first_name} ${student.last_name}`}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={grades[student.id]?.partial || ""}
                            onChange={(e) =>
                              handleGradeChange(student.id, "partial", e.target.value)
                            }
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={grades[student.id]?.exam || ""}
                            onChange={(e) => handleGradeChange(student.id, "exam", e.target.value)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell className="font-bold">
                          {average > 0 ? average.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell>{average > 0 && getAverageBadge(average)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Button onClick={handleSave} className="w-full">
                Save Grades
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Grades;