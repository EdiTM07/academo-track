import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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

const Attendance = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchStudents();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchAttendance();
    }
  }, [selectedSubject, selectedDate]);

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

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("student_id, present")
      .eq("subject_id", selectedSubject)
      .eq("date", format(selectedDate, "yyyy-MM-dd"));

    const attendanceMap: Record<string, boolean> = {};
    data?.forEach((record) => {
      attendanceMap[record.student_id] = record.present;
    });
    setAttendance(attendanceMap);
  };

  const handleAttendanceChange = (studentId: string, present: boolean) => {
    setAttendance({ ...attendance, [studentId]: present });
  };

  const handleSave = async () => {
    if (!selectedSubject) {
      toast({ title: "Error", description: "Please select a subject", variant: "destructive" });
      return;
    }

    try {
      const records = students.map((student) => ({
        date: format(selectedDate, "yyyy-MM-dd"),
        student_id: student.id,
        subject_id: selectedSubject,
        present: attendance[student.id] || false,
      }));

      const { error } = await supabase.from("attendance").upsert(records, {
        onConflict: "date,student_id,subject_id",
      });

      if (error) throw error;

      toast({ title: "Success", description: "Attendance saved successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Attendance</h1>
        <p className="text-muted-foreground">Track student attendance by subject and date</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
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
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedSubject && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.id_number}</TableCell>
                      <TableCell>{`${student.first_name} ${student.last_name}`}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={attendance[student.id] || false}
                          onCheckedChange={(checked) =>
                            handleAttendanceChange(student.id, checked as boolean)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={handleSave} className="w-full">
                Save Attendance
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;