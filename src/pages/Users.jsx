import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, UserX, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUsers, createUser, updateUser } from '../api/users';
import { getFacilities, getLgas } from '../api/facilities';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Field } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { formatDate } from '../lib/formatters';

const ROLE_LABELS = {
  admin:              'Admin',
  central_logistics:  'Central logistics',
  facility_user:      'Facility user',
  dso:                'Data Support Officer',
  viewer:             'Viewer',
};
const ROLE_TONES = {
  admin:             'brand',
  central_logistics: 'amber',
  facility_user:     'neutral',
  dso:               'amber',
  viewer:            'neutral',
};

// Treat empty-string / null / undefined as "absent". Without this, an empty
// id field (e.g. for an admin) gets coerced to 0 and fails .positive().
const optionalId = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().positive().optional()
);

// ── Create user schema ────────────────────────────────────────────────────────
const createSchema = z.object({
  full_name:   z.string().trim().min(1, 'Full name is required'),
  username:    z.string().trim().min(3, 'At least 3 characters'),
  email:       z.string().email('Valid email required'),
  password:    z.string().min(8, 'At least 8 characters'),
  role:        z.enum(['admin', 'central_logistics', 'facility_user', 'viewer', 'dso']),
  facility_id: optionalId,
  lga_id:      optionalId,
})
  .refine(
    (d) => d.role !== 'facility_user' || typeof d.facility_id === 'number',
    { message: 'Please select a facility', path: ['facility_id'] }
  )
  .refine(
    (d) => d.role !== 'dso' || typeof d.lga_id === 'number',
    { message: 'Please select an LGA', path: ['lga_id'] }
  );

// ── Edit user schema (password optional) ─────────────────────────────────────
const editSchema = z.object({
  full_name:   z.string().trim().min(1).optional(),
  email:       z.string().email().optional(),
  role:        z.enum(['admin', 'central_logistics', 'facility_user', 'viewer', 'dso']).optional(),
  facility_id: optionalId,
  lga_id:      optionalId,
  is_active:   z.boolean().optional(),
  password:    z.string().min(8).optional().or(z.literal('')),
});

function UserForm({ user, facilities, lgas, onSubmit, loading }) {
  const isEdit = Boolean(user);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: user
      ? {
          full_name:   user.full_name,
          email:       user.email,
          role:        user.role,
          facility_id: user.facility_id ?? '',
          lga_id:      user.lga_id      ?? '',
          is_active:   user.is_active,
          password:    '',
        }
      : { role: 'viewer', facility_id: '', lga_id: '' },
  });

  const role = watch('role');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field id="full_name" label="Full name" required={!isEdit} error={errors.full_name?.message}>
        <Input id="full_name" {...register('full_name')} placeholder="e.g. Amaka Okonkwo" error={errors.full_name?.message} />
      </Field>

      {!isEdit && (
        <Field id="username" label="Username" required error={errors.username?.message}>
          <Input id="username" {...register('username')} placeholder="e.g. amaka.okonkwo" error={errors.username?.message} />
        </Field>
      )}

      <Field id="email" label="Email" required={!isEdit} error={errors.email?.message}>
        <Input id="email" type="email" {...register('email')} placeholder="e.g. amaka@health.gov.ng" error={errors.email?.message} />
      </Field>

      <Field id="role" label="Role" required={!isEdit} error={errors.role?.message}>
        <Select id="role" {...register('role')} error={errors.role?.message}>
          <option value="viewer">Viewer</option>
          <option value="facility_user">Facility user</option>
          <option value="dso">Data Support Officer (LGA)</option>
          <option value="central_logistics">Central logistics</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>

      {role === 'facility_user' && (
        <Field id="facility_id" label="Facility" required error={errors.facility_id?.message}>
          <Select id="facility_id" {...register('facility_id')} error={errors.facility_id?.message}>
            <option value="">Select facility…</option>
            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.lga_name})</option>)}
          </Select>
        </Field>
      )}

      {role === 'dso' && (
        <Field id="lga_id" label="LGA" required hint="The DSO will only see facilities and movements within this LGA." error={errors.lga_id?.message}>
          <Select id="lga_id" {...register('lga_id')} error={errors.lga_id?.message}>
            <option value="">Select LGA…</option>
            {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
      )}

      <Field id="password" label={isEdit ? 'New password' : 'Password'} required={!isEdit} hint={isEdit ? 'Leave blank to keep current password.' : undefined} error={errors.password?.message}>
        <Input id="password" type="password" {...register('password')} placeholder="Min 8 characters" error={errors.password?.message} />
      </Field>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input type="checkbox" {...register('is_active')} className="rounded border-line accent-brand-700" />
          Account active
        </label>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save changes' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}

export default function Users() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [addOpen,         setAddOpen]         = useState(false);
  const [editUser,        setEditUser]        = useState(null);
  const [confirmToggle,   setConfirmToggle]   = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: facData }   = useQuery({ queryKey: ['facilities'], queryFn: () => getFacilities({ limit: 200 }) });
  const { data: lgaData }   = useQuery({ queryKey: ['lgas'],       queryFn: getLgas });

  const users      = data?.data      ?? [];
  const facilities = facData?.data   ?? [];
  const lgas       = lgaData?.data   ?? [];

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); setAddOpen(false); },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to create user'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }) => updateUser(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); setEditUser(null); },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to update user'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => updateUser(id, { is_active }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(vars.is_active ? 'User reactivated' : 'User deactivated');
      setConfirmToggle(null);
    },
    onError: (err) => toast.error(err.response?.data?.error ?? 'Failed to update user'),
  });

  function handleToggleClick(targetUser) {
    if (targetUser.id === currentUser?.id) {
      toast.error("You can't deactivate your own account");
      return;
    }
    if (targetUser.is_active) {
      // Destructive direction — confirm first.
      setConfirmToggle(targetUser);
    } else {
      // Reactivation is a low-risk, single-click action.
      toggleActiveMutation.mutate({ id: targetUser.id, is_active: true });
    }
  }

  function handleCreate(data) {
    const payload = { ...data };
    // Only the role-appropriate scoping field is sent; the other is dropped.
    if (data.role !== 'facility_user') delete payload.facility_id;
    if (data.role !== 'dso')           delete payload.lga_id;
    if (!payload.facility_id) delete payload.facility_id;
    if (!payload.lga_id)      delete payload.lga_id;
    createMutation.mutate(payload);
  }

  function handleEdit(data) {
    const payload = { ...data };
    if (!payload.password) delete payload.password;
    // Force the irrelevant scoping field to null so the backend clears it.
    payload.facility_id = data.role === 'facility_user' ? payload.facility_id ?? null : null;
    payload.lga_id      = data.role === 'dso'           ? payload.lga_id      ?? null : null;
    editMutation.mutate({ id: editUser.id, body: payload });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Users"
        subtitle="Manage who can access the system and what they can do."
        actions={
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
            Add user
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-stone-50/60 text-left">
                  <th className="px-5 py-3 font-medium text-muted">Name</th>
                  <th className="px-5 py-3 font-medium text-muted">Username</th>
                  <th className="px-5 py-3 font-medium text-muted">Role</th>
                  <th className="px-5 py-3 font-medium text-muted">Scope</th>
                  <th className="px-5 py-3 font-medium text-muted">Status</th>
                  <th className="px-5 py-3 font-medium text-muted">Last login</th>
                  <th className="px-5 py-3 font-medium text-muted"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted">No users yet.</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-900 text-xs font-semibold text-white">
                          {u.full_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-ink">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{u.username}</td>
                    <td className="px-5 py-3">
                      <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {u.facility_name
                        ? u.facility_name
                        : u.lga_name
                          ? `${u.lga_name} LGA`
                          : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={u.is_active ? 'brand' : 'red'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{formatDate(u.last_login_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditUser(u)}
                          className="rounded-md p-1.5 text-muted hover:bg-stone-100 hover:text-ink transition-colors"
                          aria-label={`Edit ${u.full_name}`}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleClick(u)}
                          disabled={u.id === currentUser?.id}
                          className={
                            u.id === currentUser?.id
                              ? 'rounded-md p-1.5 text-muted/40 cursor-not-allowed'
                              : u.is_active
                                ? 'rounded-md p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600'
                                : 'rounded-md p-1.5 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700'
                          }
                          aria-label={u.is_active ? `Deactivate ${u.full_name}` : `Reactivate ${u.full_name}`}
                          title={
                            u.id === currentUser?.id
                              ? 'You cannot deactivate yourself'
                              : u.is_active
                                ? 'Deactivate user'
                                : 'Reactivate user'
                          }
                        >
                          {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add new user">
        <UserForm facilities={facilities} lgas={lgas} onSubmit={handleCreate} loading={createMutation.isPending} />
      </Modal>

      <Modal open={Boolean(editUser)} onClose={() => setEditUser(null)} title={`Edit — ${editUser?.full_name ?? ''}`}>
        {editUser && (
          <UserForm user={editUser} facilities={facilities} lgas={lgas} onSubmit={handleEdit} loading={editMutation.isPending} />
        )}
      </Modal>

      <Modal
        open={Boolean(confirmToggle)}
        onClose={() => setConfirmToggle(null)}
        title="Deactivate user?"
        size="sm"
      >
        {confirmToggle && (
          <div>
            <p className="text-sm text-ink">
              <span className="font-semibold">{confirmToggle.full_name}</span> will no longer be able to sign in.
              You can reactivate them later if needed.
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-accent-700">
              <span className="font-medium">Their audit trail stays intact.</span>{' '}
              Past movements they recorded won't be removed — that's why we deactivate rather than delete.
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmToggle(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={toggleActiveMutation.isPending}
                leftIcon={<UserX size={15} />}
                onClick={() => toggleActiveMutation.mutate({ id: confirmToggle.id, is_active: false })}
              >
                Deactivate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
