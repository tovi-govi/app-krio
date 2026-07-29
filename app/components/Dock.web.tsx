'use client';

import type { ReactNode } from 'react';
import { Children, cloneElement } from 'react';

import './Dock.css';

function DockItem({ children, className = '', onClick, label }: { children: ReactNode; className?: string; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`dock-item ${className}`} aria-label={label}>
      {Children.map(children, (child) => cloneElement(child as any))}
    </button>
  );
}

function DockLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`dock-label ${className}`} role="tooltip">
      {children}
    </div>
  );
}

function DockIcon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

export type DockItemData = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
};

type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: { mass: number; stiffness: number; damping: number };
};

export default function Dock({ items, className = '', panelHeight = 68 }: DockProps) {
  return (
    <div className="dock-outer">
      <div className={`dock-panel ${className}`} style={{ height: panelHeight }} role="toolbar" aria-label="Application dock">
        {items.map((item, index) => (
          <DockItem key={index} onClick={item.onClick} className={item.className} label={item.label}>
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </div>
    </div>
  );
}
