import React, { useState, useEffect } from 'react';
import { Button, StatusChip, Dialog, FormField } from '@torbat/ui';
import {
  ArrowRight,
  Clock,
  Building2,
  MapPin,
  Send,
  UserCheck,
  Share2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Star,
  ExternalLink,
  MessageSquare,
  Lock,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { formatJalaliDateTime, formatRelative, requestStatusLabels } from '@torbat/i18n';
import { adminApi, type AdminRequestDetail } from '../api/client';
import { useStaffAuth } from '../context/StaffAuthContext';

export interface CaseDetailPageProps {
  id: string;
  onBack: () => void;
}

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({ id, onBack }) => {
  const { staff } = useStaffAuth();
  const [data, setData] = useState<AdminRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNextStatus, setSelectedNextStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Comment Form
  const [commentBody, setCommentBody] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<'internal' | 'public_to_citizen'>('internal');
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadCase = () => {
    setLoading(true);
    adminApi
      .getRequestDetail(id)
      .then((res) => {
        setData(res.data);
        if (res.data.allowedTransitions.length > 0) {
          setSelectedNextStatus(res.data.allowedTransitions[0]);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  // Load members when assign modal opens
  const handleOpenAssign = async () => {
    if (!data?.organizationId) return;
    setShowAssignModal(true);
    try {
      const res = await adminApi.getOrgMembers(data.organizationId);
      setOrgMembers(res.data);
      if (res.data.length > 0) setSelectedAssignee(res.data[0].userId);
    } catch (e) {
      console.error(e);
    }
  };

  // Load organizations when transfer modal opens
  const handleOpenTransfer = async () => {
    setShowTransferModal(true);
    try {
      const res = await adminApi.getOrganizations();
      const filtered = res.data.filter((o) => o.id !== data?.organizationId);
      setOrgs(filtered);
      if (filtered.length > 0) setTargetOrgId(filtered[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async () => {
    if (!selectedNextStatus) return;
    setSubmittingStatus(true);
    try {
      await adminApi.changeStatus(id, {
        status: selectedNextStatus,
        reason: statusReason.trim() || undefined,
        note: statusReason.trim() || undefined,
      });
      setShowStatusModal(false);
      setStatusReason('');
      loadCase();
    } catch (err: any) {
      alert(err.message || 'خطا در تغییر وضعیت پرونده');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    setSubmittingAssign(true);
    try {
      await adminApi.assignRequest(id, {
        assigneeId: selectedAssignee,
        note: assignNote.trim() || undefined,
      });
      setShowAssignModal(false);
      setAssignNote('');
      loadCase();
    } catch (err: any) {
      alert(err.message || 'خطا در ارجاع پرونده');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleTransfer = async () => {
    if (!targetOrgId || !transferReason.trim()) return;
    setSubmittingTransfer(true);
    try {
      await adminApi.transferRequest(id, {
        targetOrgId,
        reason: transferReason.trim(),
      });
      setShowTransferModal(false);
      setTransferReason('');
      loadCase();
    } catch (err: any) {
      alert(err.message || 'خطا در انتقال پرونده به سازمان دیگر');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await adminApi.addComment(id, {
        body: commentBody.trim(),
        visibility: commentVisibility,
      });
      setCommentBody('');
      loadCase();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت یادداشت');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs border border-slate-200">
        در حال دریافت مشخصات کامل پرونده...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right pb-12">
      {/* 1. Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowRight size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                {data.trackingCode}
              </span>
              <StatusChip status={data.status as any} />
            </div>
            <h1 className="font-black text-base text-slate-900 mt-1">
              {data.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {data.permissions.canChangeStatus && data.allowedTransitions.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowStatusModal(true)}
              className="bg-[#592582] hover:bg-[#7541A5] text-xs"
            >
              تغییر وضعیت پرونده
            </Button>
          )}

          {data.permissions.canAssign && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenAssign}
              className="text-xs flex items-center gap-1.5"
            >
              <UserCheck size={14} />
              <span>ارجاع به کارشناس</span>
            </Button>
          )}

          {data.permissions.canTransfer && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenTransfer}
              className="text-xs flex items-center gap-1.5"
            >
              <Share2 size={14} />
              <span>انتقال به سازمان دیگر</span>
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={loadCase} className="p-2">
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* 2. Main Grid: Details & Map (Left/Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Attachments & Citizen Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Request Information Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-purple-600" />
              اطلاعات و شرح درخواست شهروند
            </h3>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-800 leading-relaxed">
              {data.description}
            </div>

            {/* Dynamic Form Entries */}
            {data.formEntries && data.formEntries.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-xs text-slate-700">اطلاعات تکمیلی فرم خدمت:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {data.formEntries.map((fe, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                      <span className="text-slate-400 text-[11px] block">{fe.label}:</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{fe.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Attachments */}
            {data.attachments && data.attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-bold text-xs text-slate-700">تصاویر و مستندات پیوست:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {data.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 block"
                    >
                      <img
                        src={att.url}
                        alt="پیوست"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <ExternalLink size={14} />
                        <span>مشاهده تصویر</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Citizen Satisfaction (If resolved/rated) */}
            {data.satisfactionScore && (
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900">بازخورد و رضایت‌سنجی شهروند:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={
                          star <= (data.satisfactionScore || 0)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }
                      />
                    ))}
                  </div>
                </div>
                {data.satisfactionComment && (
                  <p className="text-xs text-amber-800 italic">
                    «{data.satisfactionComment}»
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Location Map (If coordinates provided) */}
          {data.lat && data.lng && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <MapPin size={18} className="text-purple-600" />
                  موقعیت مکانی ثبت‌شده بر روی نقشه تربت حیدریه
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  {data.lat.toFixed(4)}, {data.lng.toFixed(4)}
                </span>
              </div>

              {data.address && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                  <strong>نشانی تقریبی:</strong> {data.address}
                </p>
              )}

              <div className="relative w-full h-56 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                <iframe
                  title="موقعیت پرونده"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.lng - 0.008}%2C${data.lat - 0.005}%2C${data.lng + 0.008}%2C${data.lat + 0.005}&layer=mapnik&marker=${data.lat}%2C${data.lng}`}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* Comments & Communication Feed */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-purple-600" />
              یادداشت‌های داخلی و پیام‌های به شهروند
            </h3>

            {/* Add Comment Box */}
            <form onSubmit={handleAddComment} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCommentVisibility('internal')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
                    commentVisibility === 'internal'
                      ? 'bg-purple-700 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <Lock size={12} />
                  <span>یادداشت محرمانه داخلی (فقط کارشناسان)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCommentVisibility('public_to_citizen')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors flex items-center gap-1.5 ${
                    commentVisibility === 'public_to_citizen'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <Globe size={12} />
                  <span>پاسخ رسمی به شهروند (نمایش در اپ شهروند)</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder={
                  commentVisibility === 'internal'
                    ? 'یادداشت داخلی برای همکاران و سرپرست...'
                    : 'پاسخ به شهروند (همراه با اعلان داخل سامانه)…'
                }
                className="w-full p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingComment}
                  disabled={!commentBody.trim()}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Send size={14} />
                  <span>ثبت پیام</span>
                </Button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3 pt-2">
              {data.comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  هنوز یادداشتی برای این پرونده ثبت نشده است.
                </p>
              ) : (
                data.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                      c.visibility === 'internal'
                        ? 'bg-purple-50/50 border-purple-200'
                        : 'bg-blue-50/50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{c.authorName}</span>
                        {c.visibility === 'internal' ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock size={10} />
                            یادداشت محرمانه
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Globe size={10} />
                            پاسخ عمومی به شهروند
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatRelative(new Date(c.createdAt))}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Meta Info & Status History Timeline */}
        <div className="space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
            <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">
              مشخصات پرونده
            </h3>

            <div className="space-y-2.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">سازمان مسئول:</span>
                <span className="font-bold text-slate-800">{data.organizationName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">عنوان خدمت:</span>
                <span className="font-bold text-slate-800">{data.serviceTitle}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">نام شهروند:</span>
                <span className="font-bold text-slate-800">{data.citizenName || 'ثبت‌شده در سامانه'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">شماره تماس:</span>
                <span className="font-mono text-slate-800 font-bold dir-ltr">{data.citizenMobile}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">اولویت:</span>
                <span className="font-bold">
                  {data.priority === 'urgent' && <span className="text-rose-600">فوری</span>}
                  {data.priority === 'high' && <span className="text-amber-600">بالا</span>}
                  {data.priority === 'normal' && <span className="text-slate-600">عادی</span>}
                  {data.priority === 'low' && <span className="text-slate-400">پایین</span>}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">تاریخ ثبت:</span>
                <span className="font-bold text-slate-800">{formatJalaliDateTime(new Date(data.createdAt))}</span>
              </div>

              {data.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">تاریخ رفع مشکل:</span>
                  <span className="font-bold text-emerald-700">{formatJalaliDateTime(new Date(data.resolvedAt))}</span>
                </div>
              )}
            </div>
          </div>

          {/* History Timeline */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Clock size={16} className="text-purple-600" />
              تاریخچه تغییرات و گردش پرونده
            </h3>

            <div className="relative pr-4 space-y-5 before:absolute before:right-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
              {data.history.map((h) => (
                <div key={h.id} className="relative">
                  <div className="absolute -right-4 top-1 w-3 h-3 rounded-full bg-purple-600 border-2 border-white shadow-xs" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {requestStatusLabels[h.toStatus as keyof typeof requestStatusLabels]?.staff || h.toStatus}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({h.actorKind === 'citizen' ? 'شهروند' : 'کارشناس'})
                    </span>
                  </div>
                  {h.reason && (
                    <p className="text-[11px] text-slate-500 mt-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {h.reason}
                    </p>
                  )}
                  <div className="text-[10px] text-slate-400 mt-1">
                    {formatRelative(new Date(h.createdAt))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Status Transition Dialog */}
      <Dialog
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="تغییر وضعیت رسمی پرونده"
      >
        <div className="space-y-4 pt-2 text-xs">
          <p className="text-slate-600">
            بر اساس گردش‌کار استاندارد سامانه، وضعیت‌های مجاز بعدی برای این پرونده عبارتند از:
          </p>

          <FormField label="وضعیت جدید">
            <select
              value={selectedNextStatus}
              onChange={(e) => setSelectedNextStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              {data.allowedTransitions.map((st) => (
                <option key={st} value={st}>
                  {requestStatusLabels[st as keyof typeof requestStatusLabels]?.staff || st}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="شرح علت یا توضیحات اقدام (ثبت در پرونده)">
            <textarea
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="توضیح دهید چه اقدامی صورت گرفته یا چرا وضعیت تغییر می‌کند..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowStatusModal(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleStatusChange}
              isLoading={submittingStatus}
              className="bg-[#592582] hover:bg-[#7541A5]"
            >
              ثبت تغییر وضعیت
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 4. Assign Dialog */}
      <Dialog
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="ارجاع پرونده به کارشناس مسئول"
      >
        <div className="space-y-4 pt-2 text-xs">
          <p className="text-slate-600">
            کارشناس مورد نظر از لیست پرسنل سازمان <strong>{data.organizationName}</strong> را انتخاب نمایید:
          </p>

          <FormField label="انتخاب کارشناس">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              {orgMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name || 'کارشناس'} ({m.mobile}) - {m.role}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="دستور کار / یادداشت ارجاع">
            <textarea
              rows={2}
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              placeholder="دستور اقدام برای کارشناس مربوطه..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleAssign}
              isLoading={submittingAssign}
              className="bg-[#592582] hover:bg-[#7541A5]"
            >
              تایید ارجاع
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 5. Transfer Dialog */}
      <Dialog
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="انتقال بین‌سازمانی پرونده"
      >
        <div className="space-y-4 pt-2 text-xs">
          <p className="text-slate-600">
            در صورت تشخیص عدم ارتباط موضوع با سازمان فعلی، پرونده را به سازمان ذی‌صلاح منتقل نمایید:
          </p>

          <FormField label="سازمان مقصد">
            <select
              value={targetOrgId}
              onChange={(e) => setTargetOrgId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.shortName})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="علت انتقال (الزامی)">
            <textarea
              rows={3}
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="مثلاً: با بررسی محل مشخص شد شکستگی مربوط به لوله آب شرب است و باید توسط شرکت آبفا رفع گردد..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowTransferModal(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleTransfer}
              isLoading={submittingTransfer}
              disabled={!transferReason.trim()}
              className="bg-rose-700 hover:bg-rose-800"
            >
              تایید و انتقال پرونده
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
