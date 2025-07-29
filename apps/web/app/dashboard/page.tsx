"use client";

import { motion } from "framer-motion";
import { 
  FolderOpen, 
  Globe, 
  Key, 
  Settings, 
  Plus, 
  Search,
  ArrowRight,
  Copy,
  Edit,
  Trash2
} from "lucide-react";
import { Button } from "@repo/ui/button";
import { useState } from "react";

const sidebarItems = [
  { icon: FolderOpen, label: "Projects", active: true },
  { icon: Globe, label: "Languages", active: false },
  { icon: Key, label: "API Keys", active: false },
  { icon: Settings, label: "Settings", active: false },
];

const mockProjects = [
  {
    id: 1,
    name: "E-commerce App",
    description: "Main shopping application translations",
    languages: ["en", "es", "fr", "de"],
    keys: 142,
    lastUpdated: "2 hours ago",
  },
  {
    id: 2,
    name: "Mobile App",
    description: "React Native mobile application",
    languages: ["en", "ja", "ko"],
    keys: 89,
    lastUpdated: "1 day ago",
  },
  {
    id: 3,
    name: "Admin Dashboard",
    description: "Internal admin panel translations",
    languages: ["en"],
    keys: 67,
    lastUpdated: "3 days ago",
  },
];

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
              Unlingo
            </span>
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item, index) => (
              <li key={index}>
                <button
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                    item.active
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-900"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">U</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">User</p>
              <p className="text-xs text-gray-400">user@example.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-950 border-b border-gray-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Projects</h2>
              <p className="text-gray-400 mt-1">Manage your translation projects</p>
            </div>
            <Button className="bg-white text-black hover:bg-gray-200 cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8">
          {/* Search and Filters */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-gray-400 text-sm">{project.description}</p>
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded cursor-pointer">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Languages</span>
                    <div className="flex space-x-1">
                      {project.languages.map((lang) => (
                        <span
                          key={lang}
                          className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs"
                        >
                          {lang.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Translation Keys</span>
                    <span className="text-white font-medium">{project.keys}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Last Updated</span>
                    <span className="text-gray-300">{project.lastUpdated}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800">
                  <a 
                    href="/dashboard/editor"
                    className="w-full flex items-center justify-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <span>Open Project</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State (when no projects match search) */}
          {mockProjects.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400 mb-2">No projects found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first translation project.</p>
              <Button className="bg-white text-black hover:bg-gray-200 cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}