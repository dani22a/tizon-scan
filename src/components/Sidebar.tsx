"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers,
  Camera,
  ArrowLeft,
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
      className={`w-80 shrink-0 flex flex-col transition-all h-full ${
        isOpen
          ? "fixed top-20 bottom-4 left-4 z-40 shadow-2xl"
          : "hidden lg:flex"
      } lg:sticky lg:top-4`}
    >
      <div className="h-full rounded-[28px] border border-white/10 bg-linear-to-br from-slate-950 via-brand-950 to-brand-900 text-white shadow-[0_25px_80px_-40px_rgba(15,23,42,0.9)] overflow-hidden">
        <div className="lg:hidden p-3 flex justify-end">
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/80 hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="px-5 pt-1 pb-4 border-b border-white/10">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-200/80">
              AI Workspace
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Centro de análisis visual
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Navega entre diagnóstico, carga de videos e historial desde una experiencia
              más editorial.
            </p>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {navGroups.map((group) => (
            <div
              key={group.heading}
              className="mb-5"
            >
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-brand-200/65">
                {group.heading}
              </p>
              <div className="space-y-1">
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
                    `group w-full text-left px-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-between gap-3 transition-all ` +
                    (active
                      ? "bg-white text-brand-900 shadow-[0_16px_35px_-22px_rgba(96,165,250,0.95)]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white");

                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className={baseClasses}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.icon &&
                          React.cloneElement(item.icon as React.ReactElement<any>, {
                            className: active
                              ? "text-brand-700"
                              : "text-brand-200/70 group-hover:text-brand-100",
                            size: 18,
                          })}
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full transition-colors ${
                          active ? "bg-brand-500" : "bg-white/10 group-hover:bg-brand-300/60"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mx-4 mb-4 rounded-3xl border border-brand-300/15 bg-white/5 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.24em] text-brand-200/65">
            Estado
          </p>
          <p className="mt-2 text-sm text-slate-200">
            Panel preparado para una navegación enfocada en IA y análisis visual.
          </p>
        </div>
      </div>
    </aside>
  );
}
