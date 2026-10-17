import { Button } from "@/components/ui/button";
import { assets } from "../assets";

export function Navigation() {  return (<> <nav className="nav" aria-label="Main navigation"><div className="container nav-inner"><a href="#top" className="brand" aria-label="Elijah home">{"ELIJAH"}<span>{"."}</span></a><div className="nav-links"><a href="#work">{"Work"}</a><a href="#services" className="services-nav">{"Services"}</a><a href="#pricing">{"Offers"}</a><a href="#about">{"About"}</a><Button asChild variant="portfolio" className="nav-contact portfolio-button"><a href="#contact">{"Let's talk ↗"}</a></Button></div></div></nav> </>); }
