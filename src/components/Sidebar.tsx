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
      className={`flex h-full w-72 shrink-0 flex-col transition-all ${
        isOpen
          ? "fixed top-20 bottom-4 left-4 z-40 shadow-2xl"
          : "hidden lg:flex"
      } lg:sticky lg:top-4`}
    >
      <div className="h-full overflow-hidden rounded-[24px] border border-white/10 bg-linear-to-br from-slate-950 via-brand-950 to-brand-900 text-white shadow-[0_25px_80px_-40px_rgba(15,23,42,0.9)]">
        <div className="flex justify-end p-2.5 lg:hidden">
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="border-b border-white/10 px-4 pt-1 pb-3">
          <div className="rounded-[22px] border border-white/10 bg-white/5 px-3.5 py-3.5 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-brand-200/80">
              AI Workspace
            </p>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
              Centro de análisis visual
            </h2>
            <p className="mt-1.5 text-[13px] leading-5 text-slate-300">
              Navega entre diagnóstico, carga de videos e historial desde una experiencia
              más editorial.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div
              key={group.heading}
              className="mb-4"
            >
              <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-brand-200/65">
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
                    `group flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition-all ` +
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
                            size: 17,
                          })}
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full transition-colors ${
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

        <div className="mx-3 mb-3 rounded-[22px] border border-brand-300/15 bg-white/5 px-3.5 py-3.5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-brand-200/65">
            Estado
          </p>
          <p className="mt-1.5 text-[13px] leading-5 text-slate-200">
            Panel preparado para una navegación enfocada en IA y análisis visual.
          </p>
        </div>
      </div>
    </aside>
  );
}
