import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SectionTab,
  PropertyItem,
  PropertyType,
  UserProfile,
  ListingRequest,
  ClaimRequest,
  VerificationRequest,
  StudentBooking,
  ReviewItem,
  PropertyReport,
  OwnerPropertyImage,
  AreaItem,
  AdminNotification,
  AdminActivityLog,
  SystemSetting,
} from './types';
import {
  supabase,
  initialSeedData,
  fetchAllDataFromSupabase,
  updatePropertyVerification,
  toggleUserDisabledState,
  savePropertyToSupabase,
  deletePropertyFromSupabase,
  propVerified,
  propStatus,
} from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { AnalyticsView } from './components/AnalyticsView';
import { UserManagementView } from './components/UserManagementView';
import { PropertiesView } from './components/PropertiesView';
import { UnverifiedPropertiesView } from './components/UnverifiedPropertiesView';
import { PlatformControlViews } from './components/PlatformControlViews';
import { IntelligenceViews } from './components/IntelligenceViews';
import { PropertyPreviewModal } from './components/PropertyPreviewModal';
import { UserProfileModal } from './components/UserProfileModal';
import { OwnerEditModal } from './components/OwnerEditModal';
import { AdvancedPropertyModal } from './components/AdvancedPropertyModal';
import { Toast } from './components/Toast';
import { AuthScreen } from './components/AuthScreen';

export default function App() {
  // Authentication & Session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [adminEmail, setAdminEmail] = useState<string>('satpalswami22742@gmail.com');

  // Navigation
  const [currentTab, setCurrentTab] = useState<SectionTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // System State
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  // Entities Data State
  const [properties, setProperties] = useState<PropertyItem[]>(initialSeedData.properties);
  const [students, setStudents] = useState<UserProfile[]>(initialSeedData.students);
  const [owners, setOwners] = useState<UserProfile[]>(initialSeedData.owners);
  const [listingRequests, setListingRequests] = useState<ListingRequest[]>(initialSeedData.listingRequests);
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>(initialSeedData.claimRequests);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(initialSeedData.verificationRequests);
  const [bookings, setBookings] = useState<StudentBooking[]>(initialSeedData.bookings);
  const [reviews, setReviews] = useState<ReviewItem[]>(initialSeedData.reviews);
  const [reports, setReports] = useState<PropertyReport[]>(initialSeedData.reports);
  const [mediaImages, setMediaImages] = useState<OwnerPropertyImage[]>(initialSeedData.mediaImages);
  const [areas, setAreas] = useState<AreaItem[]>(initialSeedData.areas);
  const [notifications, setNotifications] = useState<AdminNotification[]>(initialSeedData.notifications);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>(initialSeedData.activityLogs);
  const [settings, setSettings] = useState<SystemSetting[]>(initialSeedData.settings);

  // Modals
  const [previewProperty, setPreviewProperty] = useState<PropertyItem | null>(null);
  const [userProfileModal, setUserProfileModal] = useState<UserProfile | null>(null);
  const [ownerEditModal, setOwnerEditModal] = useState<UserProfile | null>(null);
  const [propertyEditor, setPropertyEditor] = useState<{
    isOpen: boolean;
    property: PropertyItem | null;
    type: PropertyType;
  }>({
    isOpen: false,
    property: null,
    type: 'hostels',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  // Sync / Load data from Supabase
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const fetched = await fetchAllDataFromSupabase();
      if (fetched.properties?.length) setProperties(fetched.properties);
      if (fetched.students?.length) setStudents(fetched.students);
      if (fetched.owners?.length) setOwners(fetched.owners);
      if (fetched.listingRequests?.length) setListingRequests(fetched.listingRequests);
      if (fetched.claimRequests?.length) setClaimRequests(fetched.claimRequests);
      if (fetched.verificationRequests?.length) setVerificationRequests(fetched.verificationRequests);
      if (fetched.bookings?.length) setBookings(fetched.bookings);
      if (fetched.reviews?.length) setReviews(fetched.reviews);
      if (fetched.reports?.length) setReports(fetched.reports);
      if (fetched.mediaImages?.length) setMediaImages(fetched.mediaImages);
      if (fetched.areas?.length) setAreas(fetched.areas);
      if (fetched.notifications?.length) setNotifications(fetched.notifications);
      if (fetched.activityLogs?.length) setActivityLogs(fetched.activityLogs);
      if (fetched.settings?.length) setSettings(fetched.settings);

      setDbConnected(true);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.warn('Supabase fetch notice:', err?.message);
      setDbConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Log activity helper
  const logActivity = useCallback((action: string, entityType: string, entityId: string | number, detail: any) => {
    const newLog: AdminActivityLog = {
      id: Date.now(),
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      admin_email: adminEmail,
      new_value: detail,
      created_at: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  }, [adminEmail]);

  // Counts for badge notifications in sidebar
  const pendingListingCount = useMemo(
    () => listingRequests.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length,
    [listingRequests]
  );
  const pendingClaimCount = useMemo(
    () => claimRequests.filter((c) => (c.status || 'pending').toLowerCase() === 'pending').length,
    [claimRequests]
  );
  const unverifiedCount = useMemo(
    () => properties.filter((p) => !propVerified(p)).length,
    [properties]
  );
  const pendingReportCount = useMemo(
    () => reports.filter((rp) => (rp.status || 'investigating').toLowerCase() !== 'resolved').length,
    [reports]
  );
  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => (n.status || 'unread').toLowerCase() === 'unread').length,
    [notifications]
  );

  // Property Handlers
  const handleOpenPropertyPreview = (property: PropertyItem) => {
    setPreviewProperty(property);
  };

  const handleOpenPropertyEditor = (property: PropertyItem | null, type: PropertyType = 'hostels') => {
    setPropertyEditor({
      isOpen: true,
      property,
      type,
    });
  };

  const handleSaveProperty = async (saved: PropertyItem) => {
    try {
      const result = await savePropertyToSupabase(saved);
      setProperties((prev) => {
        const idx = prev.findIndex((p) => String(p.id) === String(result.id));
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...result };
          return copy;
        }
        return [result, ...prev];
      });
      logActivity(
        propertyEditor.property ? 'update_property' : 'create_property',
        'property',
        result.id,
        { name: result.name, area: result.area }
      );
      showToast(`Property "${result.name}" saved successfully in directory!`);
      setPropertyEditor({ isOpen: false, property: null, type: 'hostels' });
    } catch (err: any) {
      showToast(err?.message || 'Error saving property', 'error');
    }
  };

  const handleToggleVerification = async (property: PropertyItem, nextVerified: boolean) => {
    try {
      await updatePropertyVerification(property.id, nextVerified, property.category);
      setProperties((prev) =>
        prev.map((p) =>
          String(p.id) === String(property.id)
            ? { ...p, verified: nextVerified, is_verified: nextVerified }
            : p
        )
      );
      if (previewProperty && String(previewProperty.id) === String(property.id)) {
        setPreviewProperty((prev) =>
          prev ? { ...prev, verified: nextVerified, is_verified: nextVerified } : null
        );
      }
      logActivity('toggle_verification', 'property', property.id, { verified: nextVerified });
      showToast(
        `Property "${property.name}" is now ${nextVerified ? 'Verified ★' : 'Unverified'}`
      );
    } catch (err: any) {
      showToast(err?.message || 'Error updating verification', 'error');
    }
  };

  const handleDeleteProperty = async (property: PropertyItem) => {
    if (!window.confirm(`Are you sure you want to delete "${property.name}"? This action is permanent.`)) {
      return;
    }
    try {
      await deletePropertyFromSupabase(property.id, property.category);
      setProperties((prev) => prev.filter((p) => String(p.id) !== String(property.id)));
      if (previewProperty && String(previewProperty.id) === String(property.id)) {
        setPreviewProperty(null);
      }
      logActivity('delete_property', 'property', property.id, { name: property.name });
      showToast(`Property "${property.name}" deleted successfully.`);
    } catch (err: any) {
      showToast(err?.message || 'Error deleting property', 'error');
    }
  };

  const handleBulkAction = async (
    action: 'verify' | 'activate' | 'suspend' | 'feature',
    selectedIds: string[]
  ) => {
    if (!selectedIds.length) return;
    setProperties((prev) =>
      prev.map((p) => {
        if (!selectedIds.includes(String(p.id))) return p;
        if (action === 'verify') return { ...p, verified: true, is_verified: true };
        if (action === 'activate') return { ...p, status: 'active' };
        if (action === 'suspend') return { ...p, status: 'suspended' };
        if (action === 'feature') return { ...p, featured: true, is_featured: true };
        return p;
      })
    );
    logActivity(`bulk_${action}`, 'properties', selectedIds.join(','), { count: selectedIds.length });
    showToast(`Bulk action "${action}" applied to ${selectedIds.length} properties.`);
  };

  // User Handlers
  const handleToggleUserStatus = async (userId: string, currentlyDisabled: boolean) => {
    try {
      await toggleUserDisabledState(userId, !currentlyDisabled);
      const nextStatus = currentlyDisabled ? 'active' : 'disabled';

      setStudents((prev) =>
        prev.map((s) => (String(s.id) === String(userId) ? { ...s, status: nextStatus } : s))
      );
      setOwners((prev) =>
        prev.map((o) => (String(o.id) === String(userId) ? { ...o, status: nextStatus } : o))
      );
      logActivity('toggle_user_status', 'user', userId, { new_status: nextStatus });
      showToast(`User status updated to ${nextStatus}.`);
    } catch (err: any) {
      showToast(err?.message || 'Error updating user status', 'error');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (!window.confirm('Delete this user account? Associated permissions will be removed.')) return;
    setStudents((prev) => prev.filter((s) => String(s.id) !== String(userId)));
    setOwners((prev) => prev.filter((o) => String(o.id) !== String(userId)));
    logActivity('delete_user', 'user', userId, {});
    showToast('User profile removed.');
  };

  const handleSaveOwnerEdit = (updatedOwner: UserProfile) => {
    setOwners((prev) =>
      prev.map((o) => (String(o.id) === String(updatedOwner.id) ? updatedOwner : o))
    );
    // Also update any matching property contact details
    setProperties((prev) =>
      prev.map((p) => {
        if (p.owner_id && String(p.owner_id) === String(updatedOwner.id)) {
          return {
            ...p,
            owner_name: updatedOwner.full_name || p.owner_name,
            phone: updatedOwner.phone || p.phone,
          };
        }
        return p;
      })
    );
    setOwnerEditModal(null);
    logActivity('update_owner', 'user', updatedOwner.id, { name: updatedOwner.full_name });
    showToast(`Owner profile for ${updatedOwner.full_name} updated successfully.`);
  };

  // Listing Request Decision
  const handleApproveListing = (id: string | number) => {
    const req = listingRequests.find((r) => String(r.id) === String(id));
    if (!req) return;

    // Convert request to active property
    const newProperty: PropertyItem = {
      id: `prop-live-${Date.now()}`,
      name: req.name || req.property_name || 'Approved Accommodation',
      category: req.category || req.property_type || 'Hostel',
      area: req.area || 'Kota',
      address: req.address || 'Landmark Road, Kota',
      city: 'Kota',
      owner_name: req.owner_name || 'Direct Owner',
      phone: req.phone || '',
      price: req.price || '₹6,500/mo',
      status: 'active',
      verified: true,
      featured: false,
      rating: 4.8,
      views_count: 1,
      booking_count: 0,
      created_at: new Date().toISOString(),
    };

    setProperties((prev) => [newProperty, ...prev]);
    setListingRequests((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? { ...r, status: 'approved' } : r))
    );
    logActivity('approve_listing', 'listing_request', id, { property_name: newProperty.name });
    showToast(`Listing "${newProperty.name}" approved & published live!`);
  };

  const handleRejectListing = (id: string | number) => {
    setListingRequests((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? { ...r, status: 'rejected' } : r))
    );
    logActivity('reject_listing', 'listing_request', id, {});
    showToast('Listing request marked as rejected.');
  };

  // Claim Decisions
  const handleApproveClaim = (id: string | number) => {
    setClaimRequests((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, status: 'approved' } : c))
    );
    logActivity('approve_claim', 'claim_request', id, {});
    showToast('Ownership claim approved.');
  };

  const handleRejectClaim = (id: string | number) => {
    setClaimRequests((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, status: 'rejected' } : c))
    );
    logActivity('reject_claim', 'claim_request', id, {});
    showToast('Ownership claim rejected.');
  };

  // Verification Center Decisions
  const handleApproveVerification = (id: string | number) => {
    const v = verificationRequests.find((item) => String(item.id) === String(id));
    if (v && v.property_id) {
      setProperties((prev) =>
        prev.map((p) =>
          String(p.id) === String(v.property_id) ? { ...p, verified: true, is_verified: true } : p
        )
      );
    }
    setVerificationRequests((prev) =>
      prev.map((req) => (String(req.id) === String(id) ? { ...req, status: 'approved' } : req))
    );
    logActivity('approve_verification', 'verification_request', id, {});
    showToast('Verification request approved. Badge issued.');
  };

  const handleRejectVerification = (id: string | number) => {
    setVerificationRequests((prev) =>
      prev.map((req) => (String(req.id) === String(id) ? { ...req, status: 'rejected' } : req))
    );
    logActivity('reject_verification', 'verification_request', id, {});
    showToast('Verification request rejected.');
  };

  // Booking Status Toggle
  const handleToggleBookingStatus = (id: string | number, nextStatus: string) => {
    setBookings((prev) =>
      prev.map((b) => (String(b.id) === String(id) ? { ...b, status: nextStatus } : b))
    );
    logActivity('update_booking_status', 'booking', id, { status: nextStatus });
    showToast(`Booking #${id} status changed to ${nextStatus}.`);
  };

  // Review Status Toggle
  const handleToggleReviewStatus = (id: string | number, nextStatus: string) => {
    setReviews((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? { ...r, status: nextStatus } : r))
    );
    logActivity('update_review_status', 'review', id, { status: nextStatus });
    showToast(`Review #${id} status changed to ${nextStatus}.`);
  };

  // Resolve Report
  const handleResolveReport = (id: string | number, nextStatus: string) => {
    setReports((prev) =>
      prev.map((rp) => (String(rp.id) === String(id) ? { ...rp, status: nextStatus } : rp))
    );
    logActivity('resolve_report', 'report', id, { status: nextStatus });
    showToast(`Report #${id} resolved.`);
  };

  // Unfeature Property
  const handleUnfeatureProperty = (property: PropertyItem) => {
    setProperties((prev) =>
      prev.map((p) =>
        String(p.id) === String(property.id)
          ? { ...p, featured: false, is_featured: false }
          : p
      )
    );
    logActivity('remove_feature', 'property', property.id, {});
    showToast(`Removed "${property.name}" from featured listings.`);
  };

  // Media Upload & Delete
  const handleUploadMedia = async (propertyId: string, file: File, category: string) => {
    // Generate mock public URL or supabase storage upload
    const mockUrl = URL.createObjectURL(file);
    const newMedia: OwnerPropertyImage = {
      id: Date.now(),
      property_id: propertyId,
      url: mockUrl,
      public_url: mockUrl,
      category,
      created_at: new Date().toISOString(),
    };
    setMediaImages((prev) => [newMedia, ...prev]);
    logActivity('upload_media', 'media', newMedia.id, { property_id: propertyId, category });
  };

  const handleDeleteMedia = (id: string | number) => {
    setMediaImages((prev) => prev.filter((m) => String(m.id) !== String(id)));
    logActivity('delete_media', 'media', id, {});
    showToast('Media image deleted.');
  };

  // Areas
  const handleAddArea = async (name: string, city: string) => {
    const newArea: AreaItem = {
      id: Date.now(),
      name,
      area_name: name,
      city,
      state: 'Rajasthan',
      status: 'active',
      created_at: new Date().toISOString(),
    };
    setAreas((prev) => [...prev, newArea]);
    logActivity('add_area', 'area', newArea.id, { name, city });
    showToast(`Area "${name}" added.`);
  };

  const handleEditArea = async (id: string | number, name: string) => {
    setAreas((prev) =>
      prev.map((a) => (String(a.id) === String(id) ? { ...a, name, area_name: name } : a))
    );
    logActivity('edit_area', 'area', id, { name });
    showToast(`Area updated to "${name}".`);
  };

  // Notifications
  const handleMarkNotificationRead = (id: string | number) => {
    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === String(id) ? { ...n, status: 'read' } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    showToast('All notifications marked as read.');
  };

  // Settings
  const handleUpdateSetting = async (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key || s.setting_key === key ? { ...s, value } : s))
    );
    logActivity('update_setting', 'setting', key, { value });
    showToast(`Setting "${key}" updated.`);
  };

  // Password
  const handleUpdatePassword = async (newPass: string) => {
    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
    }
    logActivity('update_password', 'auth', adminEmail, {});
  };

  // If not logged in, render AuthScreen
  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLoginSuccess={(email) => {
          setAdminEmail(email);
          setIsAuthenticated(true);
          showToast(`Welcome Director ${email}! Authenticated.`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050b1a] text-slate-100 flex overflow-hidden font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* Toast Notification Container */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        counts={{
          listingRequests: pendingListingCount,
          claimRequests: pendingClaimCount,
          unverified: unverifiedCount,
          reports: pendingReportCount,
          notifications: unreadNotificationCount,
        }}
      />

      {/* Main Dashboard Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-gradient-to-b from-[#060e22] via-[#050b1a] to-[#040814]">
        {/* Top Header Bar */}
        <Header
          currentTab={currentTab}
          adminEmail={adminEmail}
          dbConnected={dbConnected}
          isRefreshing={isRefreshing}
          onRefresh={loadData}
          onSignOut={() => {
            setIsAuthenticated(false);
            showToast('Director session signed out.', 'info');
          }}
          onOpenPropertyEditor={() => handleOpenPropertyEditor(null, 'hostels')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Dynamic Content Views */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-20">
          {/* 1. Overview */}
          {currentTab === 'overview' && (
            <OverviewView
              onSelectTab={setCurrentTab}
              properties={properties}
              students={students}
              owners={owners}
              listingRequests={listingRequests}
              claimRequests={claimRequests}
              verificationRequests={verificationRequests}
              bookings={bookings}
              reviews={reviews}
              reports={reports}
              dbConnected={dbConnected}
              adminEmail={adminEmail}
              lastSync={lastSync}
              onOpenPropertyPreview={handleOpenPropertyPreview}
            />
          )}

          {/* 2. Visual Analytics & Charts */}
          {currentTab === 'analytics' && (
            <AnalyticsView
              properties={properties}
              students={students}
              owners={owners}
              bookings={bookings}
              reviews={reviews}
            />
          )}

          {/* 3. User Management */}
          {(currentTab === 'user-management' || currentTab === 'students' || currentTab === 'owners') && (
            <UserManagementView
              students={students}
              owners={owners}
              properties={properties}
              bookings={bookings}
              reviews={reviews}
              onOpenUserProfile={(user) => setUserProfileModal(user)}
              onEditOwner={(owner) => setOwnerEditModal(owner)}
              onToggleStatus={handleToggleUserStatus}
              onDeleteUser={handleDeleteUser}
              onAddPropertyForOwner={(owner) => {
                setPropertyEditor({
                  isOpen: true,
                  property: {
                    id: '',
                    name: `${owner.full_name}'s Accommodation`,
                    owner_name: owner.full_name,
                    phone: owner.phone,
                    category: 'Hostel',
                    city: 'Kota',
                    status: 'active',
                    verified: true,
                    created_at: new Date().toISOString(),
                  },
                  type: 'hostels',
                });
              }}
            />
          )}

          {/* 4. Unified All Properties */}
          {currentTab === 'properties' && (
            <PropertiesView
              categoryFilter="all"
              properties={properties}
              onOpenPreview={handleOpenPropertyPreview}
              onOpenEditor={handleOpenPropertyEditor}
              onToggleVerification={handleToggleVerification}
              onDeleteProperty={handleDeleteProperty}
              onBulkAction={handleBulkAction}
            />
          )}

          {/* 5. Hostels & PG Directory */}
          {currentTab === 'hostels' && (
            <PropertiesView
              categoryFilter="hostels"
              properties={properties}
              onOpenPreview={handleOpenPropertyPreview}
              onOpenEditor={handleOpenPropertyEditor}
              onToggleVerification={handleToggleVerification}
              onDeleteProperty={handleDeleteProperty}
              onBulkAction={handleBulkAction}
            />
          )}

          {/* 6. Tiffin & Mess Directory */}
          {currentTab === 'tiffins' && (
            <PropertiesView
              categoryFilter="tiffins"
              properties={properties}
              onOpenPreview={handleOpenPropertyPreview}
              onOpenEditor={handleOpenPropertyEditor}
              onToggleVerification={handleToggleVerification}
              onDeleteProperty={handleDeleteProperty}
              onBulkAction={handleBulkAction}
            />
          )}

          {/* 7. Study Libraries Directory */}
          {currentTab === 'libraries' && (
            <PropertiesView
              categoryFilter="libraries"
              properties={properties}
              onOpenPreview={handleOpenPropertyPreview}
              onOpenEditor={handleOpenPropertyEditor}
              onToggleVerification={handleToggleVerification}
              onDeleteProperty={handleDeleteProperty}
              onBulkAction={handleBulkAction}
            />
          )}

          {/* 8. Cafes Directory */}
          {currentTab === 'cafes' && (
            <PropertiesView
              categoryFilter="cafes"
              properties={properties}
              onOpenPreview={handleOpenPropertyPreview}
              onOpenEditor={handleOpenPropertyEditor}
              onToggleVerification={handleToggleVerification}
              onDeleteProperty={handleDeleteProperty}
              onBulkAction={handleBulkAction}
            />
          )}

          {/* 9. Bookstores Directory */}
          {currentTab === 'bookstores' && (
            <PropertiesView
              categoryFilter="bookstores"
              properties={properties}
              onOpenPreview={handleOpenPropertyPreview}
              onOpenEditor={handleOpenPropertyEditor}
              onToggleVerification={handleToggleVerification}
              onDeleteProperty={handleDeleteProperty}
              onBulkAction={handleBulkAction}
            />
          )}

          {/* 10. Unverified Properties Queue */}
          {currentTab === 'unverified-properties' && (
            <UnverifiedPropertiesView
              properties={properties}
              onOpenPreview={handleOpenPropertyPreview}
              onVerifyProperty={(p) => handleToggleVerification(p, true)}
              onRefresh={loadData}
              isRefreshing={isRefreshing}
            />
          )}

          {/* 11. Platform Controls (Listings, Claims, Verification, Bookings, Reviews, Reports, Media, Featured) */}
          {[
            'listing-requests',
            'claim-requests',
            'verification',
            'bookings',
            'reviews',
            'reports',
            'media',
            'featured',
          ].includes(currentTab) && (
            <PlatformControlViews
              currentSubTab={currentTab as any}
              listingRequests={listingRequests}
              claimRequests={claimRequests}
              verificationRequests={verificationRequests}
              bookings={bookings}
              reviews={reviews}
              reports={reports}
              mediaImages={mediaImages}
              properties={properties}
              onApproveListing={handleApproveListing}
              onRejectListing={handleRejectListing}
              onApproveClaim={handleApproveClaim}
              onRejectClaim={handleRejectClaim}
              onApproveVerification={handleApproveVerification}
              onRejectVerification={handleRejectVerification}
              onToggleBookingStatus={handleToggleBookingStatus}
              onToggleReviewStatus={handleToggleReviewStatus}
              onResolveReport={handleResolveReport}
              onUnfeatureProperty={handleUnfeatureProperty}
              onUploadMedia={handleUploadMedia}
              onDeleteMedia={handleDeleteMedia}
              onPreviewProperty={handleOpenPropertyPreview}
            />
          )}

          {/* 12. Intelligence & Governance (Areas, Notifications, Activity, Settings, Categories, Admin) */}
          {[
            'areas',
            'notifications',
            'activity',
            'settings',
            'categories',
            'admin',
          ].includes(currentTab) && (
            <IntelligenceViews
              currentSubTab={currentTab as any}
              areas={areas}
              notifications={notifications}
              activityLogs={activityLogs}
              settings={settings}
              properties={properties}
              onAddArea={handleAddArea}
              onEditArea={handleEditArea}
              onMarkNotificationRead={handleMarkNotificationRead}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onUpdateSetting={handleUpdateSetting}
              onUpdatePassword={handleUpdatePassword}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Property Preview Modal (Image-2 Visual Pop-up) */}
      {previewProperty && (
        <PropertyPreviewModal
          property={previewProperty}
          onClose={() => setPreviewProperty(null)}
          onEdit={(p) => {
            setPreviewProperty(null);
            handleOpenPropertyEditor(p, 'hostels');
          }}
          onToggleVerification={(p, next) => handleToggleVerification(p, next)}
          onDelete={(p) => handleDeleteProperty(p)}
        />
      )}

      {/* 2. User Profile Modal */}
      {userProfileModal && (
        <UserProfileModal
          user={userProfileModal}
          onClose={() => setUserProfileModal(null)}
          onToggleStatus={(id, curDisabled) => handleToggleUserStatus(id, curDisabled)}
        />
      )}

      {/* 3. Owner Edit Modal */}
      {ownerEditModal && (
        <OwnerEditModal
          owner={ownerEditModal}
          onClose={() => setOwnerEditModal(null)}
          onSave={handleSaveOwnerEdit}
        />
      )}

      {/* 4. Advanced Property Editor (Unified Hostel, Tiffin, Library, Cafe, Bookstore) */}
      {propertyEditor.isOpen && (
        <AdvancedPropertyModal
          property={propertyEditor.property}
          initialType={propertyEditor.type}
          onClose={() => setPropertyEditor({ isOpen: false, property: null, type: 'hostels' })}
          onSave={handleSaveProperty}
        />
      )}
    </div>
  );
}
