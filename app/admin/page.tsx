"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { ArrowLeft, Plus, Power, PowerOff, Award, type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";

// Helper to render Lucide icon from string name
const ChallengeIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
  if (!Icon) {
    return <Award className={className} />; // Fallback icon
  }
  return <Icon className={className} />;
};

export default function AdminPage() {
  const isAdmin = useQuery(api.levels.isAdmin);
  const challenges = useQuery(api.challenges.getAllChallenges);
  const levelConfig = useQuery(api.levels.getLevelConfig);
  const createChallenge = useMutation(api.challenges.createChallenge);
  const toggleActive = useMutation(api.challenges.toggleChallengeActive);
  const seedChallenges = useMutation(api.seedChallenges.seedDefaultChallenges);
  const migrateBadges = useMutation(api.migrateChallenges.migrateChallengeBadges);
  const seedLevels = useMutation(api.levels.seedLevelConfig);
  const updateLevel = useMutation(api.levels.updateLevel);

  type ChallengeType = "total" | "streak" | "daily" | "weekly" | "monthly" | "recurring_monthly";

  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<{ level: number; title: string; threshold: number } | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: ChallengeType;
    target: number;
    badge: string;
    recurring: boolean;
    recurringMonth?: number;
  }>({
    name: "",
    description: "",
    type: "total",
    target: 0,
    badge: "Trophy",
    recurring: false,
    recurringMonth: undefined,
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

  // Show loading state
  if (isAdmin === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  // Show unauthorized message if not admin
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
          <p className="text-muted-foreground mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </Card>
      </main>
    );
  }

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
            {challenges && challenges.length > 0 && (
              <Button 
                variant="outline" 
                onClick={async () => {
                  const result = await migrateBadges();
                  alert(`Migrated ${result.updated} of ${result.total} challenges`);
                }}
              >
                Migrate to Icons
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as ChallengeType,
                      })
                    }
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
                  <label className="text-sm font-medium">Icon (Lucide)</label>
                  <Input
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="Trophy, Star, Flame, etc."
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
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10">
                  <ChallengeIcon iconName={challenge.badge} className="w-6 h-6 text-orange-500" />
                </div>
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

        {/* Level Management Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Level Configuration</h2>
              <p className="text-muted-foreground">Manage level titles and thresholds</p>
            </div>
            <div className="flex gap-2">
              {(!levelConfig || levelConfig.length === 0) && (
                <Button variant="outline" onClick={() => seedLevels()}>
                  Seed Defaults
                </Button>
              )}
            </div>
          </div>

          {/* Levels List */}
          <div className="space-y-4">
            {levelConfig?.map((level) => (
              <Card key={level.level} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/10 font-bold text-orange-500">
                    {level.level}
                  </div>
                  {editingLevel && editingLevel.level === level.level ? (
                    <>
                      <div className="flex-1 flex gap-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Title"
                            value={editingLevel.title}
                            onChange={(e) =>
                              setEditingLevel({ ...editingLevel, title: e.target.value })
                            }
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            placeholder="Threshold"
                            value={editingLevel.threshold}
                            onChange={(e) =>
                              setEditingLevel({
                                ...editingLevel,
                                threshold: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            await updateLevel({
                              level: editingLevel.level,
                              title: editingLevel.title,
                              threshold: editingLevel.threshold,
                            });
                            setEditingLevel(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingLevel(null)}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{level.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Threshold: {level.threshold} pomodoros
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setEditingLevel({
                            level: level.level,
                            title: level.title,
                            threshold: level.threshold,
                          })
                        }
                      >
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
