import React, { useState } from 'react';
import { Button, Card, Modal } from '../../components/ui';
import { useToast } from '../../hooks';

export default function ComponentsPreview() {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">UI Components Preview</h1>

        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Buttons</h2>
              <p className="text-sm text-slate-500">Variantes y tamaños, mobile-first layout.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => toast.info('Acción demo')} size="sm">Info</Button>
              <Button variant="primary" onClick={() => toast.success('Hecho')} size="md">Primary</Button>
              <Button variant="danger" onClick={() => toast.error('Error demo')} size="md">Danger</Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-2">Modal</h2>
          <div className="flex gap-2">
            <Button onClick={() => setOpen(true)}>Abrir modal</Button>
            <Button variant="ghost" onClick={() => toast.info('Prueba toast')}>Mostrar toast</Button>
          </div>
        </Card>

        <Modal isOpen={open} onClose={() => setOpen(false)} title="Modal demo" footer={<div className="flex gap-2 justify-end"><Button onClick={() => setOpen(false)}>Cerrar</Button></div>}>
          <p className="text-sm text-slate-600">Este modal sirve para comprobar comportamiento responsive y estilos.</p>
        </Modal>
      </div>
    </div>
  );
}
