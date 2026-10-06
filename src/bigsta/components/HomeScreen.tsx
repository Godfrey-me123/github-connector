// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import React, { useState, useMemo } from "react";
import {
  Menu,
  CreditCard,
  UserCheck,
  ScrollText,
  Home,
  Car,
  Globe,
  Receipt,
  Building2,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Layers,
  FolderOpen,
  Search,
  ShieldCheck,
  Clock,
  X,
  Info,
  CheckCircle2,
  ExternalLink,
  Phone,
  DownloadCloud,
  Settings,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useTemplateStore } from "../store/useTemplateStore";
import { ServiceMenuDrawer } from "./navigation/ServiceMenuDrawer";
import { HorizontalActionRow } from "./common/HorizontalActionRow";
import { AppFooter } from "./common/AppFooter";

export type ServiceCategory = "all" | "identity" | "civil" | "education" | "finance" | "health";

export interface ServiceItem {
  id: string;
  name: string;
  authority: string;
  description: string;
  category: ServiceCategory;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  status: "active" | "manual_request";
  badgeText: string;
  action: () => void;
  primaryActionLabel?: string;
  features?: string[];
  isPinned?: boolean;
}

export const HomeScreen: React.FC = () => {
  const {
    setActiveScreen,
    navigateSafely,
    loadSavedTemplates,
    authRole,
    setManualAppModalOpen,
    manualRequests,
  } = useTemplateStore();

  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("all");
  const [savedCount, setSavedCount] = useState<number>(0);

  // Load saved count on mount
  React.useEffect(() => {
    loadSavedTemplates()
      .then((list) => setSavedCount(list.length))
      .catch(() => {});
  }, [loadSavedTemplates]);

  // Color configurations for services
  const colorMap: Record<string, { iconBg: string; iconColor: string }> = useMemo(
    () => ({
      nida: { iconBg: "bg-blue-500/15 border-blue-500/30", iconColor: "text-[#47A5FF]" },
      driving_license: {
        iconBg: "bg-amber-500/15 border-amber-500/30",
        iconColor: "text-amber-400",
      },
      nhif: { iconBg: "bg-rose-500/15 border-rose-500/30", iconColor: "text-rose-400" },
      custom_studio: { iconBg: "bg-blue-600/20 border-blue-500/40", iconColor: "text-blue-400" },
      birth_certificate: {
        iconBg: "bg-emerald-500/15 border-emerald-500/30",
        iconColor: "text-emerald-400",
      },
      passport: { iconBg: "bg-cyan-500/15 border-cyan-500/30", iconColor: "text-cyan-400" },
      tin: { iconBg: "bg-violet-500/15 border-violet-500/30", iconColor: "text-violet-400" },
      business_license: {
        iconBg: "bg-orange-500/15 border-orange-500/30",
        iconColor: "text-orange-400",
      },
      heslb: { iconBg: "bg-indigo-500/15 border-indigo-500/30", iconColor: "text-indigo-400" },
      ajira: { iconBg: "bg-teal-500/15 border-teal-500/30", iconColor: "text-teal-400" },
    }),
    [],
  );

  // Helper to get manual request state for a service
  const getManualRequestInfo = (serviceId: string) => {
    const req = manualRequests.find((r) => r.serviceId === serviceId);
    if (!req) {
      return {
        hasRequest: false,
        status: null,
        badgeText: "Request Manual Application",
        badgeBg: "bg-[#101010]/10 text-[#101010]",
        actionLabel: "Request Application",
        stateText: "Assistance Available",
      };
    }

    switch (req.status) {
      case "PENDING":
        return {
          hasRequest: true,
          status: "PENDING",
          badgeText: "Under Review",
          badgeBg: "bg-amber-500/15 text-amber-900 border border-amber-500/30",
          actionLabel: "Check State",
          stateText: "State: Under Admin Review",
        };
      case "PROCESSING":
        return {
          hasRequest: true,
          status: "PROCESSING",
          badgeText: "On Progress",
          badgeBg: "bg-blue-500/15 text-blue-900 border border-blue-500/30",
          actionLabel: "Check State",
          stateText: "State: On Progress",
        };
      case "APPROVED":
      case "COMPLETED":
        return {
          hasRequest: true,
          status: "APPROVED",
          badgeText: "Ready",
          badgeBg: "bg-emerald-500/15 text-emerald-900 border border-emerald-500/30",
          actionLabel: "View Details",
          stateText: "State: Accepted",
        };
      case "REJECTED":
        return {
          hasRequest: true,
          status: "REJECTED",
          badgeText: "Rejected",
          badgeBg: "bg-rose-500/15 text-rose-900 border border-rose-500/30",
          actionLabel: "Review",
          stateText: "State: Rejected",
        };
      default:
        return {
          hasRequest: true,
          status: "PENDING",
          badgeText: "Under Review",
          badgeBg: "bg-amber-500/15 text-amber-900 border border-amber-500/30",
          actionLabel: "Check State",
          stateText: "State: Under Admin Review",
        };
    }
  };

  // Build the complete list of services
  const services: ServiceItem[] = useMemo(() => {
    const pinnedReady: ServiceItem[] = [
      {
        id: "nida",
        name: "NIDA Services",
        authority: "National Identification Authority",
        description:
          "Instant auto-fill, verification & CR80 card generation for Front & Back National IDs.",
        category: "identity",
        icon: UserCheck,
        iconBg: colorMap.nida.iconBg,
        iconColor: colorMap.nida.iconColor,
        status: "active",
        badgeText: "Ready (1 Token)",
        action: () => {
          useTemplateStore.getState().setManualRequestService("NIDA Services");
          navigateSafely("nida", "nida");
        },
        primaryActionLabel: "Open Service",
        features: [
          "20-Digit ID Verification",
          "Biometric Photo Upload",
          "Digital Signature Pad",
          "Barcode Sync",
        ],
        isPinned: true,
      },
      {
        id: "nida_request",
        name: "Request NIDA Info",
        authority: "National Identification Authority",
        description: "Request NIDA picture or signature upload for manual processing.",
        category: "identity",
        icon: ScrollText,
        iconBg: colorMap.nida.iconBg,
        iconColor: colorMap.nida.iconColor,
        status: "active",
        badgeText: "New",
        action: () => {
          useTemplateStore.getState().setManualRequestService("NIDA Request");
          setActiveScreen("nida_request");
        },
        primaryActionLabel: "Request Info",
        features: ["Picture Upload", "Signature Upload"],
        isPinned: true,
      },
      {
        id: "driving_license",
        name: "Driving License Services",
        authority: "Traffic & Vehicle Inspection",
        description:
          "Driver permit issuance, class endorsements & digital driver identification cards.",
        category: "civil",
        icon: Car,
        iconBg: colorMap.driving_license.iconBg,
        iconColor: colorMap.driving_license.iconColor,
        status: "active",
        badgeText: "Ready (1 Token)",
        action: () => {
          useTemplateStore.getState().setManualRequestService("Driving Licence Services");
          navigateSafely("driving_license", "driving_license");
        },
        primaryActionLabel: "Open Service",
        features: [
          "Class Endorsements (A, B, C, D, E)",
          "Penalty Point Tracking",
          "Digital QR Validation",
        ],
        isPinned: true,
      },
      {
        id: "nhif",
        name: "NHIF Membership Card",
        authority: "National Health Insurance Fund",
        description:
          "Healthcare membership smart cards, dependent coverage validation & biometric health passes.",
        category: "health",
        icon: HeartPulse,
        iconBg: colorMap.nhif.iconBg,
        iconColor: colorMap.nhif.iconColor,
        status: "active",
        badgeText: "Ready (1 Token)",
        action: () => {
          useTemplateStore.getState().setManualRequestService("NHIF Membership Card");
          navigateSafely("nhif", "nhif");
        },
        primaryActionLabel: "Open Service",
        features: [
          "Principal & Dependent Mapping",
          "Hospital Tier Endorsements",
          "Smart Card Chip Specs",
        ],
        isPinned: true,
      },
    ];

    const manualServicesRaw = [
      {
        id: "birth_certificate",
        name: "Birth Certificate Services",
        authority: "Registration, Insolvency and Trusteeship Agency",
        description:
          "Official birth records authentication, extract certificates & civil registry document assistance.",
        category: "civil" as ServiceCategory,
        icon: Globe,
        iconBg: colorMap.birth_certificate.iconBg,
        iconColor: colorMap.birth_certificate.iconColor,
        features: ["Civil Registry Sync", "Secure Hologram Layout", "Digital Archive Verification"],
      },
      {
        id: "passport",
        name: "Passport Services",
        authority: "Tanzania Immigration Services Department",
        description:
          "International travel document applications, renewal assistance & biometric passport data IDs.",
        category: "civil" as ServiceCategory,
        icon: Building2,
        iconBg: colorMap.passport.iconBg,
        iconColor: colorMap.passport.iconColor,
        features: [
          "Machine Readable Zone (MRZ)",
          "Biometric Chip Specs",
          "Travel Clearance Verification",
        ],
      },
      {
        id: "tin",
        name: "TIN Services",
        authority: "Tanzania Revenue Authority",
        description:
          "Taxpayer Identification Number cards, tax compliance credentials & PIN certificates assistance.",
        category: "finance" as ServiceCategory,
        icon: Receipt,
        iconBg: colorMap.tin.iconBg,
        iconColor: colorMap.tin.iconColor,
        features: ["Taxpayer PIN Sync", "QR Compliance Stamp", "Corporate & Individual Formats"],
      },
      {
        id: "business_license",
        name: "Business License Services",
        authority: "BRELA & Municipal Authorities",
        description:
          "Commercial enterprise registration certificates, municipal trade permits & corporate IDs assistance.",
        category: "finance" as ServiceCategory,
        icon: Building2,
        iconBg: colorMap.business_license.iconBg,
        iconColor: colorMap.business_license.iconColor,
        features: ["BRELA Certificate Layout", "Annual Renewal Badges", "Sector Trade Validation"],
      },
      {
        id: "heslb",
        name: "HESLB Student Loans Services",
        authority: "Higher Education Students’ Loans Board",
        description:
          "Student beneficiary loan allocation cards, academic verification & repayment IDs assistance.",
        category: "education" as ServiceCategory,
        icon: GraduationCap,
        iconBg: colorMap.heslb.iconBg,
        iconColor: colorMap.heslb.iconColor,
        features: [
          "Index Number Verification",
          "Institution Allocation Status",
          "Beneficiary Smart Badges",
        ],
      },
      {
        id: "ajira",
        name: "Ajira Portal Services",
        authority: "Public Service Recruitment Secretariat",
        description:
          "Government job application portfolios, civil service recruitment IDs & applicant profiles assistance.",
        category: "education" as ServiceCategory,
        icon: Briefcase,
        iconBg: colorMap.ajira.iconBg,
        iconColor: colorMap.ajira.iconColor,
        features: [
          "Civil Service Application Sync",
          "Cadre Certificate Validation",
          "Interview Pass Generation",
        ],
      },
    ];

    const manualItems: ServiceItem[] = manualServicesRaw.map((s) => {
      const info = getManualRequestInfo(s.id);
      return {
        id: s.id,
        name: s.name,
        authority: s.authority,
        description: s.description,
        category: s.category,
        icon: s.icon,
        iconBg: s.iconBg,
        iconColor: s.iconColor,
        status: "manual_request",
        badgeText: info.badgeText,
        action: () => {
          useTemplateStore.getState().setManualRequestService(s.name);
          setManualAppModalOpen(true, s);
        },
        primaryActionLabel: info.actionLabel,
        features: s.features,
        isPinned: false,
      };
    });

    return [...pinnedReady, ...manualItems];
  }, [authRole, colorMap, manualRequests, navigateSafely, setActiveScreen, setManualAppModalOpen]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesCategory =
        selectedCategory === "all" ||
        service.category === selectedCategory ||
        service.id === "custom_studio";

      const matchesSearch =
        searchQuery.trim() === "" ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.authority.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  const categories: { key: ServiceCategory; label: string }[] = [
    { key: "all", label: "All Services" },
    { key: "identity", label: "Identity & Civil" },
    { key: "education", label: "Education & Jobs" },
    { key: "finance", label: "Revenue & Business" },
    { key: "health", label: "Health & Medical" },
  ];

  return (
    <div className="min-h-screen bg-[#D8D2CE] text-[#101010] flex flex-col selection:bg-[#B5A5FF] selection:text-[#101010]">
      {/* 1. PROFESSIONAL APP HEADER: [ Menu ]          BIGSTA */}
      <header className="sticky top-0 z-40 bg-[#D8D2CE]/95 backdrop-blur-md border-b border-[#E7E2DE] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs relative">
        {/* Left: Menu Button */}
        <div className="flex items-center shrink-0 z-10">
          <button
            type="button"
            onClick={() => setIsMenuDrawerOpen(true)}
            className="px-3 py-2.5 rounded-2xl bg-[#E7E2DE] hover:bg-[#dad5d0] text-[#101010] border border-[#dad5d0] transition-colors flex items-center gap-2 cursor-pointer font-bold text-xs sm:text-sm active:scale-95 shadow-xs"
            title="Open Services Menu"
            aria-label="Open Services Navigation Menu"
          >
            <Menu className="w-5 h-5 text-[#101010]" />
            <span>Menu</span>
          </button>
        </div>

        {/* Center: BIGSTA brand title */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="font-extrabold text-[#101010] text-base sm:text-lg tracking-tight font-sans uppercase">
            BIGSTA
          </span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          <button
            type="button"
            onClick={() => setActiveScreen("downloads")}
            className="p-2.5 rounded-2xl bg-[#E7E2DE] hover:bg-[#dad5d0] text-[#101010] border border-[#dad5d0] transition-colors flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
            title="Downloads Center"
          >
            <DownloadCloud className="w-5 h-5 text-blue-600" />
          </button>

          {authRole === "admin" && (
            <button
              type="button"
              onClick={() => setActiveScreen("upload")}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 bg-[#E7E2DE] hover:bg-[#dad5d0] border border-[#dad5d0] text-xs font-bold text-[#101010] rounded-2xl transition-all shadow-xs cursor-pointer whitespace-nowrap active:scale-95"
              title="Card Studio"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#101010]" />
              <span>Studio</span>
            </button>
          )}

          {authRole === "admin" && (
            <button
              type="button"
              onClick={() => setActiveScreen("templates")}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#101010] hover:bg-[#222222] text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md group cursor-pointer whitespace-nowrap active:scale-95"
              title="Templates"
            >
              <FolderOpen className="w-4 h-4 text-[#B5A5FF] group-hover:scale-110 transition-transform" />
              <span>Templates</span>
              {savedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#B5A5FF] text-[#101010] text-[10px] font-extrabold">
                  {savedCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Services Navigation Drawer */}
      <ServiceMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        onSelectInfoService={(srv) => {
          setManualAppModalOpen(true, srv);
        }}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col pb-20 sm:pb-12">
        {/* 2. WELCOME SECTION / PAGE HEADING: Choose a Service */}
        <div className="mb-4 sm:mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-[#E7E2DE]">
          <div className="space-y-1 sm:space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101010] tracking-tight">
              Choose a Service
            </h1>

            <p className="text-[#101010]/80 text-xs sm:text-sm max-w-2xl leading-relaxed font-medium hidden sm:block">
              Select an active verified service, or request manual document application support from
              our administration desk.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-72 md:w-80 relative shrink-0">
            <Search className="w-4.5 h-4.5 text-[#101010]/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services..."
              className="search-input w-full pl-11 pr-9 focus:outline-none focus:ring-2 focus:ring-[#101010]/20 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#101010]/60 hover:text-[#101010] p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filters (Horizontal Action Row) */}
        <div className="mb-5 sm:mb-6">
          <HorizontalActionRow className="gap-2 pb-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`filter-chip cursor-pointer transition-all ${
                    isActive ? "active shadow-sm font-bold" : "font-semibold hover:bg-[#dad5d0]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </HorizontalActionRow>
        </div>

        {/* 3. SERVICES GRID (2 cards per row on mobile, 3 cards per row on desktop) */}
        {filteredServices.length === 0 ? (
          <div className="py-16 text-center bg-[#E7E2DE] rounded-[28px] border-none p-8 shadow-xs">
            <Search className="w-8 h-8 text-[#101010]/60 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#101010] mb-1">No services found</h3>
            <p className="text-xs text-[#101010]/70 max-w-sm mx-auto mb-4 font-medium">
              No service matching "{searchQuery}" in this category. Try adjusting your search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="px-5 py-2.5 bg-[#101010] hover:bg-[#222222] text-xs font-bold text-white rounded-2xl cursor-pointer shadow-sm"
            >
              Reset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pb-6">
            {filteredServices.map((service, idx) => {
              const IconComponent = service.icon;
              const isPinnedReady = service.status === "active";
              const manualInfo = getManualRequestInfo(service.id);

              const cardBgClass = "card-default";

              return (
                <div
                  key={`${service.id}-${idx}`}
                  id={`service-card-${service.id}`}
                  onClick={() => service.action()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      service.action();
                    }
                  }}
                  className={`card ${cardBgClass} transition-all duration-200 hover:-translate-y-1 active:scale-95 cursor-pointer select-none group w-full p-4 sm:p-5 flex flex-col items-center text-center justify-between rounded-2xl border border-[#E7E2DE] bg-white shadow-xs`}
                >
                  {/* Top / Icon & Title (Vertical structure: Icon above title, title below icon, subtitle below title) */}
                  <div className="flex flex-col items-center space-y-3 w-full">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#E7E2DE] text-[#101010] border border-[#dad5d0] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                      <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
                    </div>

                    <div className="space-y-1 w-full">
                      <h3 className="card-title text-xs sm:text-sm font-bold text-[#101010] line-clamp-2">
                        {service.name}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-[#101010]/60 font-medium line-clamp-1">
                        {service.authority}
                      </p>
                    </div>
                  </div>

                  {/* Bottom / Badge if applicable (No right arrow / chevron) */}
                  <div className="mt-3 w-full flex flex-col items-center">
                    {!isPinnedReady && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${manualInfo.badgeBg}`}
                      >
                        {manualInfo.status === "PENDING" ? (
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                        ) : manualInfo.status === "PROCESSING" ? (
                          <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                        ) : manualInfo.status === "APPROVED" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : manualInfo.status === "REJECTED" ? (
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                        ) : (
                          <Phone className="w-3 h-3 text-[#101010]" />
                        )}
                        <span className="truncate">{manualInfo.badgeText}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Global Footer */}
        <AppFooter />
      </main>
    </div>
  );
};
