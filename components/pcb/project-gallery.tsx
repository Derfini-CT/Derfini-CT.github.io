"use client";

import { useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Code2, Expand, ImageIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Project } from "@/lib/portfolio/types";
import type { SiteContent } from "@/lib/portfolio/site";
import { safeWebUrl } from "@/lib/portfolio/validation";
import "./project-gallery.css";

type GalleryProps = {
  projects: Project[];
  actions: SiteContent["labels"]["actions"];
  fallback: SiteContent["labels"]["fallback"];
};
type View = { id: string; mode: "details" | "image" } | null;

function ProjectImage({ source, title, unavailable, className = "", eager = false }: { source: string; title: string; unavailable: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className={`gallery-image-fallback ${className}`} role="img" aria-label={unavailable}><ImageIcon size={30} aria-hidden="true" /><span>{unavailable}</span></div> : <img src={source} alt={title} loading={eager ? "eager" : "lazy"} className={className} onError={() => setFailed(true)} />;
}

function Tags({ items }: { items: string[] }) {
  return <ul className="gallery-tags">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>;
}

function ProjectLinks({ project, repositoryLabel, demoLabel }: { project: Project; repositoryLabel: string; demoLabel: string }) {
  const repository = safeWebUrl(project.github_url);
  const demo = safeWebUrl(project.demo_url);
  return <>{repository && <a className="gallery-action gallery-action--ghost" href={repository} target="_blank" rel="noopener noreferrer"><Code2 size={16} aria-hidden="true" />{repositoryLabel}<span className="sr-only"> (opens in a new tab)</span></a>}{demo && <a className="gallery-action gallery-action--ghost" href={demo} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={16} aria-hidden="true" />{demoLabel}<span className="sr-only"> (opens in a new tab)</span></a>}</>;
}

export default function ProjectGallery(props: GalleryProps) {
  if (props.projects.length === 0) return <p className="muted">{props.fallback.projects}</p>;
  // If a project is removed or reordered during a live refresh, dismiss its old
  // view. Updates to an existing project's text/image use the latest record.
  return <ProjectGalleryContent key={props.projects.map(project => project.id).join("|")} {...props} />;
}

function ProjectGalleryContent({ projects, actions, fallback }: GalleryProps) {
  const [view, setView] = useState<View>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const selected = projects.find(project => project.id === view?.id) ?? null;
  const imageUrl = safeWebUrl(selected?.image_url);
  const copy = {
    viewProject: actions.viewProject.trim() || "View project",
    viewImage: actions.viewImage.trim() || "View full image",
    close: actions.close.trim() || "Close",
    back: actions.backToProject.trim() || "Back to project",
    repository: actions.repository.trim() || "Repository",
    demo: actions.liveDemo.trim() || "View demo",
    features: actions.keyFeatures.trim() || "Key features",
    unavailable: fallback.projectImageUnavailable.trim() || "Image unavailable. You can still view the project details and repository.",
  };

  function open(project: Project, mode: "details" | "image", event: MouseEvent<HTMLButtonElement>) {
    returnFocus.current = event.currentTarget;
    setView({ id: project.id, mode });
  }

  function changeMode(mode: "details" | "image") {
    if (!selected) return;
    setView({ id: selected.id, mode });
    requestAnimationFrame(() => { if (dialogRef.current) dialogRef.current.scrollTop = 0; titleRef.current?.focus({ preventScroll: true }); });
  }

  return <>
    <div ref={galleryRef} className="project-gallery" tabIndex={-1}>
      {projects.map((project, index) => {
        const image = safeWebUrl(project.image_url);
        return <article className="project gallery-project" key={project.id}>
          {image ? <button type="button" className="project-visual gallery-image-button" aria-label={`${copy.viewImage}: ${project.title}`} aria-haspopup="dialog" onClick={event => open(project, "image", event)}><ProjectImage key={image} source={image} title={project.title} unavailable={copy.unavailable} /><span className="gallery-image-label"><Expand size={15} aria-hidden="true" />{copy.viewImage}</span></button> : <div className="project-visual gallery-no-image"><ImageIcon size={34} strokeWidth={1.4} aria-hidden="true" /><span>{project.title}</span></div>}
          <div className="project-body gallery-project-body">
            {index < 2 && actions.featured.trim() && <span className="gallery-featured">{actions.featured}</span>}
            <h3>{project.title}</h3>
            <p className="project-summary">{project.short_description}</p>
            <Tags items={project.technologies} />
            <div className="gallery-project-actions"><button type="button" className="gallery-action gallery-action--primary" aria-label={`${copy.viewProject}: ${project.title}`} aria-haspopup="dialog" onClick={event => open(project, "details", event)}>{copy.viewProject}<ArrowRight size={16} aria-hidden="true" /></button><ProjectLinks project={project} repositoryLabel={copy.repository} demoLabel={copy.demo} /></div>
          </div>
        </article>;
      })}
    </div>

    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setView(null); }}>
      <DialogContent ref={dialogRef} className={`pcb-project-dialog${view?.mode === "image" ? " pcb-project-dialog--image" : ""}`} showCloseButton={false} onOpenAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true })); }} onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); else if (galleryRef.current?.isConnected) galleryRef.current.focus({ preventScroll: true }); else document.getElementById("projects")?.focus({ preventScroll: true }); }}>
        {selected && <>
          <DialogHeader className="gallery-dialog-header"><DialogTitle ref={titleRef} tabIndex={-1} className="gallery-dialog-title">{view?.mode === "image" ? `${copy.viewImage}: ${selected.title}` : selected.title}</DialogTitle><DialogDescription className={view?.mode === "image" ? "sr-only" : "gallery-dialog-summary"}>{selected.short_description}</DialogDescription></DialogHeader>
          <button type="button" className="gallery-dialog-close" aria-label={copy.close} onClick={() => setView(null)}><X size={20} aria-hidden="true" /></button>
          {view?.mode === "image" ? <>
            {imageUrl ? <ProjectImage key={imageUrl} source={imageUrl} title={selected.title} unavailable={copy.unavailable} eager className="gallery-full-image" /> : <p className="gallery-unavailable" role="status">{copy.unavailable}</p>}
            <div className="gallery-dialog-actions"><button type="button" className="gallery-action gallery-action--ghost" onClick={() => changeMode("details")}><ArrowLeft size={16} aria-hidden="true" />{copy.back}</button>{imageUrl && <a className="gallery-action gallery-action--ghost" href={imageUrl} target="_blank" rel="noopener noreferrer"><Expand size={16} aria-hidden="true" />{copy.viewImage}<span className="sr-only"> (opens in a new tab)</span></a>}<button type="button" className="gallery-action gallery-action--primary" onClick={() => setView(null)}>{copy.close}</button></div>
          </> : <>
            {imageUrl && <button type="button" className="gallery-detail-image-button" aria-label={`${copy.viewImage}: ${selected.title}`} onClick={() => changeMode("image")}><ProjectImage key={imageUrl} source={imageUrl} title={selected.title} unavailable={copy.unavailable} eager /><span className="gallery-image-label"><Expand size={15} aria-hidden="true" />{copy.viewImage}</span></button>}
            <Tags items={selected.technologies} />
            {(selected.full_description || fallback.projectDetails) && <section className="gallery-dialog-details"><h3>{copy.features}</h3><p>{selected.full_description || fallback.projectDetails}</p></section>}
            <div className="gallery-dialog-actions"><ProjectLinks project={selected} repositoryLabel={copy.repository} demoLabel={copy.demo} /><button type="button" className="gallery-action gallery-action--primary" onClick={() => setView(null)}>{copy.close}</button></div>
          </>}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
