"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { Badge, Card, SelectField, TextArea, TextInput } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { Priority, Shipment, TaskAssignment } from "@/lib/types";

const priorityOptions: Priority[] = ["medium", "high", "low"];

export function ShipmentTaskCard({ shipment }: Readonly<{ shipment: Shipment }>) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadTasks = async () => {
      try {
        const response = await fetch(`/api/tasks?shipmentId=${shipment.id}`, { cache: "no-store" });
        const payload = (await response.json()) as { tasks?: TaskAssignment[] };

        if (isActive && response.ok) {
          setTasks(payload.tasks ?? []);
        }
      } catch {
        if (isActive) {
          setTasks([]);
        }
      }
    };

    void loadTasks();

    return () => {
      isActive = false;
    };
  }, [shipment.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      assignedTo: String(formData.get("assignedTo") ?? ""),
      assignedBy: String(formData.get("assignedBy") ?? "Demo Admin"),
      task: String(formData.get("task") ?? ""),
      priority: String(formData.get("priority") ?? "medium"),
      dueDate: String(formData.get("dueDate") ?? ""),
    };

    try {
      const response = await fetch(`/api/shipments/${shipment.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { task?: TaskAssignment; error?: string };

      if (!response.ok || !result.task) {
        throw new Error(result.error ?? "Unable to assign task.");
      }

      setTasks((current) => [result.task as TaskAssignment, ...current]);
      setMessage("Task assigned and notification created.");
      form.reset();
      window.dispatchEvent(new Event("harborbridge:shipments-changed"));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to assign task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskAssignment["status"]) {
    setMessage(null);
    setError(null);
    setPendingTaskId(taskId);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { task?: TaskAssignment; error?: string };

      if (!response.ok || !result.task) {
        throw new Error(result.error ?? "Unable to update task.");
      }

      setTasks((current) => current.map((task) => (task.id === taskId ? result.task as TaskAssignment : task)));
      setMessage(status === "done" ? "Task marked done." : "Task reopened.");
      window.dispatchEvent(new Event("harborbridge:shipments-changed"));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update task.");
    } finally {
      setPendingTaskId(null);
    }
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <ClipboardList className="mt-1 h-5 w-5 text-sky-700" />
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Assign task</h2>
          <p className="text-sm text-zinc-600">Create an operations follow-up and alert the team.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 lg:grid-cols-2">
        <TextInput name="assignedTo" label="Assign to" placeholder="Ops teammate or email" required />
        <TextInput name="assignedBy" label="Assigned by" defaultValue="Demo Admin" required />
        <div className="lg:col-span-2">
          <TextArea name="task" label="Task" rows={3} placeholder="What needs to be done next?" required />
        </div>
        <SelectField name="priority" label="Priority" options={priorityOptions} defaultValue="medium" />
        <TextInput name="dueDate" label="Due date" type="date" />
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Assigning..." : "Assign task"}
          </button>
          {message && <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>}
        </div>
      </form>

      <div className="mt-6 border-t border-zinc-200 pt-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-950">Recent assigned tasks</h3>
        </div>
        <div className="mt-3 space-y-3">
          {tasks.length === 0 && <p className="text-sm text-zinc-600">No assigned tasks yet.</p>}
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">{task.assignedTo}</p>
                <Badge value={task.priority} />
                <Badge value={task.status} />
              </div>
              <p className="mt-2 text-sm text-zinc-700">{task.task}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Assigned by {task.assignedBy}
                {task.dueDate ? ` - due ${task.dueDate}` : ""} - {formatDateTime(task.createdAt)}
              </p>
              <button
                type="button"
                disabled={pendingTaskId === task.id}
                onClick={() => void updateTaskStatus(task.id, task.status === "done" ? "open" : "done")}
                className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {task.status === "done" ? "Reopen" : "Mark done"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
