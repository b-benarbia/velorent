import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Bike, Zap, Mountain, Package, Heart, Gauge, Flag, Wrench, Plus } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  AVAILABLE:   { label: 'Disponible',   color: 'bg-green-100 text-green-700',   dot: 'bg-green-400' },
  RENTED:      { label: 'En location',  color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  MAINTENANCE: { label: 'Maintenance',  color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
  RETIRED:     { label: 'Retiré',       color: 'bg-gray-100 text-gray-400',     dot: 'bg-gray-300' },
}

const TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType; bg: string; iconColor: string }> = {
  CITY:     { label: 'Vélos de ville',    Icon: Bike,     bg: 'bg-blue-50',   iconColor: 'text-blue-500' },
  ELECTRIC: { label: 'Vélos électriques', Icon: Zap,      bg: 'bg-yellow-50', iconColor: 'text-yellow-500' },
  MOUNTAIN: { label: 'VTT',               Icon: Mountain, bg: 'bg-green-50',  iconColor: 'text-green-600' },
  CARGO:    { label: 'Vélos cargo',       Icon: Package,  bg: 'bg-purple-50', iconColor: 'text-purple-500' },
  KIDS:     { label: 'Vélos enfant',      Icon: Heart,    bg: 'bg-pink-50',   iconColor: 'text-pink-500' },
  ESCOOTER: { label: 'Trottinettes',      Icon: Gauge,    bg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
  ROAD:     { label: 'Vélos de route',    Icon: Flag,     bg: 'bg-red-50',    iconColor: 'text-red-500' },
}

// Type ordering
const TYPE_ORDER = ['CITY', 'ELECTRIC', 'MOUNTAIN', 'ROAD', 'CARGO', 'KIDS', 'ESCOOTER']

export default async function BikesPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant } = await params
  const session = await requireSession()

  const bikes = await prisma.bike.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { code: 'asc' },
  })

  // Group bikes by type
  const grouped = bikes.reduce<Record<string, typeof bikes>>((acc, bike) => {
    if (!acc[bike.type]) acc[bike.type] = []
    acc[bike.type].push(bike)
    return acc
  }, {})

  // Sort groups: known types first (in order), then unknown types
  const sortedTypes = [
    ...TYPE_ORDER.filter(t => grouped[t]),
    ...Object.keys(grouped).filter(t => !TYPE_ORDER.includes(t)),
  ]

  const stats = {
    total: bikes.length,
    available: bikes.filter(b => b.status === 'AVAILABLE').length,
    rented: bikes.filter(b => b.status === 'RENTED').length,
    maintenance: bikes.filter(b => b.status === 'MAINTENANCE').length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flotte</h1>
          <p className="text-sm text-gray-400 mt-0.5">{stats.total} véhicule{stats.total !== 1 ? 's' : ''} au total</p>
        </div>
        <Link
          href={`/${tenant}/bikes/new`}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Ajouter un vélo
        </Link>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.available}</p>
          <p className="text-xs text-green-500 mt-0.5">Disponibles</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.rented}</p>
          <p className="text-xs text-blue-500 mt-0.5">En location</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{stats.maintenance}</p>
          <p className="text-xs text-orange-400 mt-0.5">Maintenance</p>
        </div>
      </div>

      {/* Empty state */}
      {bikes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-14 text-center">
          <div className="flex justify-center mb-3"><Bike size={36} className="text-gray-200" /></div>
          <p className="text-gray-400 mb-4 text-sm">Aucun vélo dans la flotte</p>
          <Link
            href={`/${tenant}/bikes/new`}
            className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700"
          >
            Ajouter le premier vélo
          </Link>
        </div>
      )}

      {/* Grouped sections */}
      <div className="space-y-8">
        {sortedTypes.map(type => {
          const group = grouped[type]
          const config = TYPE_CONFIG[type] ?? { label: type, Icon: Bike, bg: 'bg-gray-50', iconColor: 'text-gray-500' }
          const { Icon, label, bg, iconColor } = config
          const availableCount = group.filter(b => b.status === 'AVAILABLE').length

          return (
            <div key={type}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={iconColor} />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{label}</h2>
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {group.length} vélo{group.length !== 1 ? 's' : ''}
                  </span>
                  {availableCount > 0 && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      {availableCount} dispo
                    </span>
                  )}
                </div>
              </div>

              {/* Bike cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.map(bike => {
                  const status = STATUS_CONFIG[bike.status] ?? STATUS_CONFIG.AVAILABLE
                  return (
                    <Link
                      key={bike.id}
                      href={`/${tenant}/bikes/${bike.id}`}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {bike.name}
                          </p>
                          <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {bike.code}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </div>
                      </div>

                      {bike.status === 'MAINTENANCE' && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-500">
                          <Wrench size={11} /> En maintenance
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
