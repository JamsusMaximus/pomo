"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { ArrowLeft, Plus, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminPage() {
  const challenges = useQuery(api.challenges.getAllChallenges);
  const createChallenge = useMutation(api.challenges.createChallenge);
  const toggleActive = useMutation(api.challenges.toggleChallengeActive);
  const seedChallenges = useMutation(api.seedChallenges.seedDefaultChallenges);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "total" as const,
    target: 0,
    badge: "🏆",
    recurring: false,
    recurringMonth: undefined as number | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createChallenge(formData);
    setFormData({
      name: "",
      description: "",
      type: "total",
      target: 0,
      badge: "🏆",
      recurring: false,
      recurringMonth: undefined,
    });
    setShowForm(false);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage challenges and badges</p>
          </div>
          <div className="flex gap-2">
            {(!challenges || challenges.length === 0) && (
              <Button variant="outline" onClick={() => seedChallenges()}>
                Seed Defaults
              </Button>
            )}
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-2" />
              New Challenge
            </Button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="First Steps"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Complete your first pomodoro"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="w-full p-2 rounded-md border bg-background"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="total">Total</option>
                    <option value="streak">Streak</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="recurring_monthly">Recurring Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Target</label>
                  <Input
                    type="number"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Badge (Emoji)</label>
                  <Input
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="🏆"
                    required
                  />
                </div>

                {formData.type === "recurring_monthly" && (
                  <div>
                    <label className="text-sm font-medium">Month (1-12)</label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.recurringMonth || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, recurringMonth: parseInt(e.target.value) })
                      }
                      placeholder="1 for January"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Challenge</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Challenges List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">All Challenges</h2>
          {challenges?.map((challenge) => (
            <Card key={challenge._id} className="p-4">
              <div className="flex items-start gap-4">
                <span className="text-4xl">{challenge.badge}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{challenge.name}</h3>
                  <p className="text-sm text-muted-foreground">{challenge.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Type: {challenge.type}</span>
                    <span>Target: {challenge.target}</span>
                    {challenge.recurringMonth && <span>Month: {challenge.recurringMonth}</span>}
                  </div>
                </div>
                <Button
                  variant={challenge.active ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleActive({ challengeId: challenge._id })}
                >
                  {challenge.active ? (
                    <>
                      <Power className="w-4 h-4 mr-2" />
                      Active
                    </>
                  ) : (
                    <>
                      <PowerOff className="w-4 h-4 mr-2" />
                      Inactive
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
