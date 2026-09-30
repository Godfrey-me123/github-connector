import React from 'react';
import { ChevronRight, Home, Layout, FileText, Layers, Eye, Download } from 'lucide-react';
import { useTemplateStore } from '../../store/useTemplateStore';
import { UniversalBackButton } from './UniversalBackButton';

interface BreadcrumbsProps {
  className?: string;
  showBackButton?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  className = '',
  showBackButton = true,
}) => {
  const { activeScreen, activeServiceId, currentTemplate, navigateSafely, authRole } = useTemplateStore();

  const serviceNames: Record<string, string> = {
    nida: 'Tanzania NIDA',
    driving_license: 'Driving Licence',
    passport: 'Passport',
    birth_certificate: 'Birth Certificate',
    tin: 'TIN Certificate',
    business_license: 'Business License',
    heslb: 'HESLB',
    nhif: 'NHIF Health Card',
    ajira: 'Ajira Portal',
  };

  const currentServiceName = serviceNames[activeServiceId] || activeServiceId.toUpperCase();

  // Generate Breadcrumb Items
  const items: Array<{ label: string; action?: () => void; icon?: React.ReactNode }> = [];

  const rootLabel = authRole === 'admin' ? 'Admin Dashboard' : 'User Dashboard';
  items.push({
    label: rootLabel,
    action: () => navigateSafely('home'),
    icon: <Home className="w-3 h-3" />,
  });

  if (activeScreen === 'editor') {
    items.push({
      label: 'Studio',
      action: () => navigateSafely('editor'),
      icon: <Layout className="w-3 h-3" />,
    });
    items.push({
      label: currentServiceName,
    });
    if (currentTemplate?.templateName) {
      items.push({
        label: currentTemplate.templateName,
      });
    }
  } else if (activeScreen === 'templates') {
    items.push({
      label: 'Template Library',
      action: () => navigateSafely('templates'),
      icon: <Layers className="w-3 h-3" />,
    });
    items.push({
      label: currentServiceName,
    });
  } else if (activeScreen === 'upload') {
    items.push({
      label: 'Upload Studio',
      action: () => navigateSafely('upload'),
    });
  } else if (activeScreen === 'nida') {
    items.push({
      label: 'NIDA Form',
      action: () => navigateSafely('nida'),
      icon: <FileText className="w-3 h-3" />,
    });
  } else if (activeScreen === 'driving_license') {
    items.push({
      label: 'Driving Licence Form',
      action: () => navigateSafely('driving_license'),
      icon: <FileText className="w-3 h-3" />,
    });
  } else if ((activeScreen as string) === 'nhif') {
    items.push({
      label: 'NHIF Membership Form',
      action: () => navigateSafely('nhif' as any),
      icon: <FileText className="w-3 h-3" />,
    });
  } else if (activeScreen === 'preview') {
    items.push({
      label: currentServiceName,
    });
    items.push({
      label: 'Card Preview',
      action: () => navigateSafely('preview'),
      icon: <Eye className="w-3 h-3" />,
    });
  } else if (activeScreen === 'downloads') {
    items.push({
      label: 'Downloads',
      action: () => navigateSafely('downloads'),
      icon: <Download className="w-3 h-3" />,
    });
  }

  return (
    <div className={`flex items-center gap-2 overflow-x-auto py-1 px-2 text-xs font-medium text-[#555555] bg-[#F8FAFC] border-b border-[#E7E9EB] ${className}`}>
      {showBackButton && <UniversalBackButton className="mr-1" />}

      <nav aria-label="Breadcrumb" className="flex items-center gap-1 shrink-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0" />}
              {isLast || !item.action ? (
                <span className="font-bold text-[#000000] flex items-center gap-1 shrink-0">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              ) : (
                <button
                  onClick={item.action}
                  className="hover:text-[#000000] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};
