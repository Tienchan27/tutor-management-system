import api from './api';
import { StudentClass } from '../types/studentClasses';

export async function listStudentClasses(): Promise<StudentClass[]> {
  const response = await api.get<StudentClass[]>('/student/classes');
  return response.data;
}
