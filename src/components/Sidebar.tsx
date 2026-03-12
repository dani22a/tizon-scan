"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers,
  CheckCircle,
  Camera,
  Info,
  ImageIcon,
  Map,
  ArrowLeft,
  Activity,
  Rows3,
} from "@/components/ui-icons";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type NavItem = {
  label: string;
  path: string;
  icon?: React.ReactElement;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  // {
  //   heading: "General",
  //   items: [{ label: "Dashboard", path: "/dashboard", icon: <Layers /> }],
  // },
  // {
  //   heading: "Evaluación",
  //   items: [
  //     {
  //       label: "Evaluación Completa",
  //       path: "/dashboard/evaluation-complete",
  //       icon: <CheckCircle />,
  //     },
  //     {
  //       label: "Evaluación por Bloques",
  //       path: "/dashboard/evaluation-batch",
  //       icon: <CheckCircle />,
  //     },
  //     { label: "Tiempo Real", path: "/dashboard/realtime", icon: <Camera /> },
  //     {
  //       label: "Historial de Predicciones",
  //       path: "/dashboard/history",
  //       icon: <Rows3 />,
  //     },
  //   ],
  // },
  // {
  //   heading: "Cultivo",
  //   items: [
  //     { label: "Módulos", path: "/dashboard/modulos", icon: <Map /> },
  //     { label: "Periodos", path: "/dashboard/periodos", icon: <Layers /> },
  //   ],
  // },
  // {
  //   heading: "Diagnóstico",
  //   items: [
  //     {
  //       label: "Diagnóstico Global",
  //       path: "/dashboard/diagnosis",
  //       icon: <Activity />,
  //     },
  //     {
  //       label: "Historial de Diagnósticos",
  //       path: "/dashboard/diagnosis-history",
  //       icon: <Rows3 />,
  //     },
  //   ],
  // },
  // {
  //   heading: "Clima y Datos",
  //   items: [
  //     {
  //       label: "Recomendaciones Climáticas",
  //       path: "/dashboard/recommendations",
  //       icon: <Info />,
  //     },
  //     {
  //       label: "Dataset y Modelos",
  //       path: "/dashboard/dataset",
  //       icon: <ImageIcon />,
  //     },
  //   ],
  // },
  {
    heading: "Análisis IA",
    items: [
      {
        label: "Dashboard",
        path: "/llm/dashboard",
        icon: <Layers />,
      },
      {
        label: "Análisis por Video",
        path: "/llm",
        icon: <Camera />,
      },
      {
        label: "Historial de Videos",
        path: "/llm/videos-history",
        icon: <Rows3 />,
      },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose(); // close the drawer on mobile
  };

  return (
    <aside
      className={`w-72 bg-white border-r border-slate-200 shrink-0 flex flex-col transition-all h-full ${
        isOpen
          ? "fixed top-16 bottom-0 left-0 z-40 shadow-xl"
          : "hidden lg:flex"
      } lg:sticky lg:top-0`}
    >
      {/* mobile close icon */}
      <div className="lg:hidden p-2 flex justify-end">
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="p-3 border-b border-slate-200 bg-white overflow-y-auto flex-1">
        {navGroups.map((group) => (
          <div
            key={group.heading}
            className="mb-3"
          >
            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                let active = false;
                if (item.path === "/llm") {
                  active = pathname === "/llm";
                } else if (item.path === "/dashboard") {
                  active =
                    pathname === "/dashboard" || pathname === "/dashboard/";
                } else {
                  active =
                    pathname === item.path ||
                    pathname.startsWith(item.path + "/");
                }
                const baseClasses =
                  `w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors ` +
                  (active
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-slate-700 hover:bg-slate-100");

                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={baseClasses}
                  >
                    {item.icon &&
                      React.cloneElement(item.icon as React.ReactElement<any>, {
                        className: active
                          ? "text-emerald-700"
                          : "text-slate-400",
                        size: 18,
                      })}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
