import React, { useState, useEffect, useRef } from 'react'
import { 
  SquareStack,
  ArrowLeft,
  ArrowRight,
  Building2,
  Home,
  Briefcase,
  TreePine,
  HelpCircle,
  LayoutGrid,
  Layers,
  CheckCircle2,
  Users,
  ChevronUp,
  ChevronDown,
  Loader2,
  Ruler,
  UserSquare2,
  Percent,
  Building,
  MapPin,
  Square,
  FileText
} from 'lucide-react'
import PropTypes from 'prop-types'
import { usageMapping } from '../utils/usageMapping'
import { rpc, giraffeState } from '@gi-nx/iframe-sdk'
import { ZONE_COLORS } from '../App'
import { EnhancedGFAExplanation } from './ui/howitworks'
import DataFlowAnimation from './ui/DataFlowAnimation'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip'
import { getUsageAssumptions } from '../utils/usageAssumptions'

// Minimum perimeter ratio threshold for valid polygons
const MIN_PERIMETER_RATIO = 0.05

// Helper function to validate polygon geometry
const isValidPolygon = (feature) => {
  try {
    // Skip features without valid structure
    if (!feature || !feature.properties || !feature.geometry || 
        !feature.geometry.coordinates || !feature.geometry.coordinates.length || 
        !feature.geometry.type) {
      console.warn('Invalid feature structure:', feature)
      return false
    }

    // Skip non-polygon features
    if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
      console.warn('Invalid geometry type:', feature.geometry.type)
      return false
    }

    // For MultiPolygon, check each polygon
    if (feature.geometry.type === 'MultiPolygon') {
      return feature.geometry.coordinates.every(polygonCoords => {
        return polygonCoords && polygonCoords.length > 0 && polygonCoords[0].length >= 4
      })
    }

    // For single Polygon, check coordinates
    const coordinates = feature.geometry.coordinates
    if (!coordinates[0] || coordinates[0].length < 4) {
      console.warn('Invalid polygon coordinates (needs at least 4 points):', coordinates)
      return false
    }

    // Calculate original perimeter
    const originalPerim = coordinates[0].reduce((acc, coord, i, arr) => {
      if (i === 0) return 0
      const prev = arr[i - 1]
      const dx = coord[0] - prev[0]
      const dy = coord[1] - prev[1]
      return acc + Math.sqrt(dx * dx + dy * dy)
    }, 0)

    // Skip if perimeter is too small
    if (originalPerim < 0.000001) {
      console.warn('Perimeter too small:', originalPerim)
      return false
    }

    // Create a small buffer to test if polygon is too thin
    const buffered = buffer(feature, 0.0001, { units: 'kilometers' })
    if (!buffered || !buffered.geometry || !buffered.geometry.coordinates || !buffered.geometry.coordinates[0]) {
      console.warn('Failed to create buffer')
      return false
    }

    // Calculate buffered perimeter
    const bufferedPerim = buffered.geometry.coordinates[0].reduce((acc, coord, i, arr) => {
      if (i === 0) return 0
      const prev = arr[i - 1]
      const dx = coord[0] - prev[0]
      const dy = coord[1] - prev[1]
      return acc + Math.sqrt(dx * dx + dy * dy)
    }, 0)

    // If the perimeter changes too much after buffering, the polygon is likely too thin
    const perimRatio = Math.abs(bufferedPerim - originalPerim) / originalPerim
    if (perimRatio >= MIN_PERIMETER_RATIO) {
      console.warn('Perimeter ratio too large:', perimRatio)
      return false
    }

    return true
  } catch (error) {
    console.warn('Error validating polygon:', error)
    return false
  }
}

// Custom select component
function CustomSelect({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getZoneFromUsage = (targetUsage) => {
    return Object.entries(usageMapping).find(([_, v]) => v === targetUsage)?.[0]?.split(' - ')[0]
  }

  return (
    <div className="relative" ref={selectRef}>
      <div
        className="flex items-center gap-2 w-full border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div 
          className="w-3 h-3 rounded-sm flex-shrink-0" 
          style={{ 
            backgroundColor: ZONE_COLORS[getZoneFromUsage(value)] || '#3b82f6',
            border: '1px solid rgba(0,0,0,0.1)'
          }} 
        />
        <span className="flex-grow">{value}</span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
          {options.map(([zone, usage]) => (
            <div
              key={usage}
              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                onChange(usage)
                setIsOpen(false)
              }}
            >
              <div 
                className="w-3 h-3 rounded-sm flex-shrink-0" 
                style={{ 
                  backgroundColor: ZONE_COLORS[zone.split(' - ')[0]] || '#3b82f6',
                  border: '1px solid rgba(0,0,0,0.1)'
                }} 
              />
              <span>{usage}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

CustomSelect.propTypes = {
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  onChange: PropTypes.func.isRequired
}

function ScenarioPlanningPage({ onBack }) {
  const [isCreatingBaseline, setIsCreatingBaseline] = useState(false)
  const [isCreatingScenario, setIsCreatingScenario] = useState(false)
  const [shortlistName, setShortlistName] = useState('')
  const [isCardsExpanded, setIsCardsExpanded] = useState(true)
  const [scenarioData, setScenarioData] = useState([])
  const [hasScenario, setHasScenario] = useState(false)
  const [hasBaseline, setHasBaseline] = useState(false)
  const [summaryStats, setSummaryStats] = useState({
    baseline: {
      totalGFA: 0,
      totalDwellings: 0,
      totalPeople: 0,
      totalJobs: 0,
      openSpace: 0
    },
    scenario: {
      totalGFA: 0,
      totalDwellings: 0,
      totalPeople: 0,
      totalJobs: 0,
      openSpace: 0
    }
  })

  // Add new state for expanded row
  const [expandedRow, setExpandedRow] = useState(null)
  const [featureList, setFeatureList] = useState([])
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)
  const [usageAssumptions, setUsageAssumptions] = useState({})

  useEffect(() => {
    const projectLayers = giraffeState.get('projectLayers')
    const shortlistLayer = projectLayers.find(layer => layer.layer_full?.name?.includes('Shortlist'))
    if (shortlistLayer) {
      setShortlistName(shortlistLayer.layer_full.name)
    }
  }, [])

  useEffect(() => {
    const loadAssumptions = async () => {
      const assumptions = await getUsageAssumptions()
      setUsageAssumptions(assumptions)
    }
    loadAssumptions()
  }, [])

  const calculateZoneAverages = (features) => {
    // Group features by zone
    const zoneGroups = features.reduce((acc, feature) => {
      const zone = feature.properties?.site_suitability__principal_zone_identifier
      if (!zone) return acc

      if (!acc[zone]) {
        acc[zone] = {
          features: [],
          totalCurrentFsr: 0,
          totalCurrentHob: 0,
          count: 0
        }
      }

      // Get FSR values
      const currentFsr = feature.properties?.site_suitability__floorspace_ratio || 0

      // Get HoB values - check both variations of property names
      const currentHob = feature.properties?.site_suitability__height_of_building || 
                        feature.properties?.height_of_building || 0

      acc[zone].features.push(feature)
      acc[zone].totalCurrentFsr += currentFsr
      acc[zone].totalCurrentHob += currentHob
      acc[zone].count++

      return acc
    }, {})

    // Convert to array format for table
    return Object.entries(zoneGroups).map(([zone, data]) => {
      const usage = usageMapping[zone] || 'Unknown'
      const landUse = giraffeState.get('projectAppsByAppID')?.[1]?.featureCategories?.usage?.[usage]?.join

      return {
        id: zone,
        zone,
        usage,
        currentFsr: data.count ? (data.totalCurrentFsr / data.count).toFixed(1) : '0.0',
        currentHob: data.count ? Math.round(data.totalCurrentHob / data.count) : '0',
        newFsr: landUse?.floorRatioTarget?.toFixed(1) || '0.0',
        newHob: Math.round(landUse?.heightOfBuilding || 0)
      }
    })
  }

  const calculateFeatureSummary = (feature, layerType) => {
    try {
      if (!feature?.properties) {
        console.warn('Feature has no properties, skipping')
        return null
      }

      // Verify this feature belongs to the correct layer
      const featureLayerId = feature.properties.layerId?.toLowerCase()
      if (!featureLayerId?.includes(layerType.toLowerCase())) {
        console.warn(`Feature has incorrect layerId: ${featureLayerId}, expected ${layerType}`)
        return null
      }

      const area = feature.properties.site_suitability__area || 0
      
      // Get FSR based on layer type
      let floorRatioTarget
      if (layerType.toLowerCase() === 'baseline') {
        floorRatioTarget = feature.properties.site_suitability__floorspace_ratio || 0
      } else {
        // For scenario, check updated value first
        floorRatioTarget = feature.properties.floor_space_ratio_updated || 
                          feature.properties.floor_space_ratio_current || 
                          feature.properties.site_suitability__floorspace_ratio || 0
      }

      const gfa = area * floorRatioTarget

      // Get land use configuration based on layer type
      const usage = layerType.toLowerCase() === 'baseline' 
        ? feature.properties.usage 
        : (feature.properties.usage_updated || feature.properties.usage_current || feature.properties.usage)
      
      const landUse = giraffeState.get('projectAppsByAppID')?.[1]?.featureCategories?.usage?.[usage]?.join

      // For scenario layer, prefer updated values over landUse defaults
      const getScenarioValue = (updatedKey, currentKey, landUseKey, defaultValue = 0) => {
        if (layerType.toLowerCase() === 'scenario') {
          return feature.properties[updatedKey] ?? 
                 feature.properties[currentKey] ?? 
                 landUse?.[landUseKey] ?? 
                 defaultValue
        }
        return landUse?.[landUseKey] ?? defaultValue
      }

      // Calculate dwellings
      const ratioResidential = getScenarioValue('ratioResidential_updated', 'ratioResidential_current', 'Ratio Residential', 0)
      const dwellingSize = getScenarioValue('dwellingSize_updated', 'dwellingSize_current', 'Dwelling Size', 1)
      const dwellings = (gfa * ratioResidential) / dwellingSize

      // Calculate people
      const personsPerDw = getScenarioValue('personsPerDw_updated', 'personsPerDw_current', 'Persons per Dw', 0)
      const people = dwellings * personsPerDw

      // Calculate jobs
      const ratioEmployment = getScenarioValue('ratioEmployment_updated', 'ratioEmployment_current', 'Ratio Employment', 0)
      const m2PerJob = getScenarioValue('m2PerJob_updated', 'm2PerJob_current', 'm2 per Job', 1)
      const jobs = (gfa * ratioEmployment) / m2PerJob

      // Calculate open space
      const isOpenSpace = getScenarioValue('isOpenSpace_updated', 'isOpenSpace_current', 'isOpenSpace', false)
      const openSpace = isOpenSpace ? area : 0

      return {
        totalGFA: Math.round(gfa),
        totalDwellings: Math.round(dwellings),
        totalPeople: Math.round(people),
        totalJobs: Math.round(jobs),
        openSpace: Math.round(openSpace)
      }
    } catch (error) {
      console.error('Error calculating feature summary:', error)
      return null
    }
  }

  const calculateSummaryStats = async (layerType) => {
    try {
      // Get both raw and baked sections
      const rawSections = giraffeState.get('rawSections')
      const bakedSections = giraffeState.get('bakedSections')
      
      if (!rawSections?.features || !bakedSections?.features) {
        console.error('No sections found')
        return null
      }

      // Filter raw sections by layerType and join with baked sections
      const layerFeatures = rawSections.features
        .filter(feature => feature.properties?.layerId?.toLowerCase() === layerType.toLowerCase())
        .map(feature => {
          const rawFeatureId = feature.properties?.id
          const bakedFeature = bakedSections.features.find(
            bakedFeature => bakedFeature.properties?.id?.startsWith(rawFeatureId)
          )

          if (feature.properties && bakedFeature?.properties) {
            // Merge in properties that are updated live by Giraffe
            feature.properties.area = bakedFeature.properties.area
          }

          return feature
        })

      if (layerFeatures.length === 0) {
        console.error(`No features found for ${layerType}`)
        return null
      }

      console.log(`Processing ${layerFeatures.length} features for ${layerType} summary`)
      
      // Process features in chunks
      const summaries = layerFeatures.map(feature => calculateFeatureSummary(feature, layerType))
                               .filter(summary => summary !== null);

      if (summaries.length === 0) {
        console.error('No valid summaries calculated')
        return null
      }

      // Combine all summaries
      const totals = summaries.reduce((acc, curr) => ({
        totalGFA: acc.totalGFA + curr.totalGFA,
        totalDwellings: acc.totalDwellings + curr.totalDwellings,
        totalPeople: acc.totalPeople + curr.totalPeople,
        totalJobs: acc.totalJobs + curr.totalJobs,
        openSpace: acc.openSpace + curr.openSpace
      }), {
        totalGFA: 0,
        totalDwellings: 0,
        totalPeople: 0,
        totalJobs: 0,
        openSpace: 0
      })

      console.log(`Completed summary calculation for ${layerType}:`, totals)
      return totals
    } catch (error) {
      console.error(`Error calculating summary stats for ${layerType}:`, error)
      return null
    }
  }

  const processLayerInChunks = async (features, layerType) => {
    const CHUNK_SIZE = 50; // Adjust this value based on your needs
    console.log(`Processing ${layerType} layer with ${features.length} features in chunks of ${CHUNK_SIZE}`)
    
    const results = [];
    for (let i = 0; i < features.length; i += CHUNK_SIZE) {
      const chunk = features.slice(i, i + CHUNK_SIZE);
      console.log(`Processing ${layerType} chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(features.length/CHUNK_SIZE)}`)
      
      // Process each feature in the chunk
      const chunkResults = chunk.map(feature => calculateFeatureSummary(feature, layerType))
                               .filter(summary => summary !== null);
      
      results.push(...chunkResults);
      
      // Small delay between chunks to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  const updateFeatures = async (features, layerType) => {
    try {
      console.log(`Updating ${features.length} features for ${layerType}`)
      
      // Update each feature
      for (const feature of features) {
        try {
          const updatedFeature = {
            ...feature,
            properties: {
              ...feature.properties,
              layerId: layerType // Use simple layerType for consistency
            }
          }
          await rpc.invoke('updateRawSection', [updatedFeature])
        } catch (error) {
          console.error(`Error updating ${layerType} feature:`, error)
        }
      }

      return true
    } catch (error) {
      console.error(`Error updating ${layerType} features:`, error)
      return false
    }
  }

  const createScenarioFeatures = async (layerData) => {
    try {
      // Process features with minimal properties
      const processedFeatures = layerData.features
        .flatMap(feature => {
          const { properties } = feature
          const principalZone = properties?.site_suitability__principal_zone_identifier
          const zoneData = scenarioData.find(data => data.zone === principalZone)
            
          // Get usage and assumptions from scenarioData if available
          const usage = zoneData?.usage || properties?.usage || properties?.current_usage || usageMapping[principalZone] || 'Unknown'
          const fsr = zoneData?.newFsr || properties?.site_suitability__floorspace_ratio || 0
          const hob = zoneData?.newHob || properties?.site_suitability__height_of_building || properties?.height_of_building || 0
          const area = properties?.site_suitability__area || 0

          // Get land use configuration for the selected usage
          const landUse = giraffeState.get('projectAppsByAppID')?.[1]?.featureCategories?.usage?.[usage]?.join

          // Only include essential properties to reduce JSON size
          const baseProperties = {
            id: properties.id,
            layerId: 'Scenario',
            // Core properties
            usage,
            usage_current: usage,
            usage_updated: usage,
            site_suitability__principal_zone_identifier: principalZone,
            site_suitability__area: area,
            site_suitability__floorspace_ratio: fsr,
            floor_space_ratio_current: fsr,
            floor_space_ratio_updated: fsr,
            height_of_building: hob,
            height_of_building_current: hob,
            height_of_building_updated: hob,
            // Land use properties from configuration
            ratioResidential: landUse?.['Ratio Residential'] || 0,
            ratioResidential_current: landUse?.['Ratio Residential'] || 0,
            ratioResidential_updated: landUse?.['Ratio Residential'] || 0,
            dwellingSize: landUse?.['Dwelling Size'] || 1,
            dwellingSize_current: landUse?.['Dwelling Size'] || 1,
            dwellingSize_updated: landUse?.['Dwelling Size'] || 1,
            personsPerDw: landUse?.['Persons per Dw'] || 0,
            personsPerDw_current: landUse?.['Persons per Dw'] || 0,
            personsPerDw_updated: landUse?.['Persons per Dw'] || 0,
            ratioEmployment: landUse?.['Ratio Employment'] || 0,
            ratioEmployment_current: landUse?.['Ratio Employment'] || 0,
            ratioEmployment_updated: landUse?.['Ratio Employment'] || 0,
            m2PerJob: landUse?.['m2 per Job'] || 1,
            m2PerJob_current: landUse?.['m2 per Job'] || 1,
            m2PerJob_updated: landUse?.['m2 per Job'] || 1,
            isOpenSpace: landUse?.isOpenSpace || false,
            isOpenSpace_current: landUse?.isOpenSpace || false,
            isOpenSpace_updated: landUse?.isOpenSpace || false
          }

          // Convert MultiPolygons to individual Polygons
          if (feature.geometry.type === 'MultiPolygon') {
            return feature.geometry.coordinates.map(polygonCoords => ({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: polygonCoords.map(ring => 
                  ring.map(coord => [
                    parseFloat(Number(coord[0]).toFixed(6)),
                    parseFloat(Number(coord[1]).toFixed(6))
                  ])
                )
              },
              properties: baseProperties
            }))
          }

          return [{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: feature.geometry.coordinates.map(ring => 
                ring.map(coord => [
                  parseFloat(Number(coord[0]).toFixed(6)),
                  parseFloat(Number(coord[1]).toFixed(6))
                ])
              )
            },
            properties: baseProperties
          }]
        })

      // Create raw sections for scenario in smaller chunks
      const CHUNK_SIZE = 25
      console.log(`Creating scenario layer with ${processedFeatures.length} features in chunks of ${CHUNK_SIZE}`)
      
      for (let i = 0; i < processedFeatures.length; i += CHUNK_SIZE) {
        const chunk = processedFeatures.slice(i, i + CHUNK_SIZE)
        console.log(`Processing chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(processedFeatures.length/CHUNK_SIZE)}`)
        
        try {
          await rpc.invoke('createRawSections', [chunk])
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.error(`Error processing chunk ${Math.floor(i/CHUNK_SIZE) + 1}:`, error)
          throw error
        }
      }

      // Wait for sections to be created and baked
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Calculate scenario stats
      const scenarioStats = await calculateSummaryStats('Scenario')
      if (scenarioStats) {
        setSummaryStats(prevStats => ({
          ...prevStats,
          scenario: scenarioStats
        }))
      }

      setHasScenario(true)
    } catch (error) {
      console.error('Error creating scenario features:', error)
      throw error
    }
  }

  const handleCreateBaseline = async () => {
    try {
      const projectLayers = giraffeState.get('projectLayers')
      const shortlistLayer = projectLayers.find(layer => layer.layer_full?.name?.includes('Shortlist'))
      if (!shortlistLayer) {
        console.error('No shortlist layer found')
        return
      }

      const layerData = await rpc.invoke('getLayerContents', [shortlistLayer.layer_full.name])
      if (!layerData?.features) {
        console.error('No features found in shortlist layer')
        return
      }

      // Calculate zone averages and set up initial scenario data
      const zoneData = calculateZoneAverages(layerData.features)
      setScenarioData(zoneData)

      // Process features with minimal properties
      const processedFeatures = layerData.features
        .flatMap(feature => {
          const { properties } = feature
          const principalZone = properties?.site_suitability__principal_zone_identifier
          const usage = properties?.usage || properties?.current_usage || usageMapping[principalZone] || 'Unknown'

          // Get the address - check both possible property names
          const address = properties?.site_suitability__address || properties?.site__address || 'No address'

          // Convert MultiPolygons to individual Polygons
          if (feature.geometry.type === 'MultiPolygon') {
            return feature.geometry.coordinates.map(polygonCoords => ({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: polygonCoords
              },
              properties: {
                id: properties.id,
                layerId: 'Baseline',
                usage,
                usage_current: usage,
                site_suitability__principal_zone_identifier: principalZone,
                site_suitability__area: properties.site_suitability__area,
                site_suitability__floorspace_ratio: properties.site_suitability__floorspace_ratio,
                height_of_building: properties?.site_suitability__height_of_building || properties?.height_of_building || 0,
                site_suitability__address: address,
                site__address: address
              }
            }))
          }

          return [{
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
              id: properties.id,
              layerId: 'Baseline',
              usage,
              usage_current: usage,
              site_suitability__principal_zone_identifier: principalZone,
              site_suitability__area: properties.site_suitability__area,
              site_suitability__floorspace_ratio: properties.site_suitability__floorspace_ratio,
              height_of_building: properties?.site_suitability__height_of_building || properties?.height_of_building || 0,
              site_suitability__address: address,
              site__address: address
            }
          }]
        })

      // Split features into chunks
      const CHUNK_SIZE = 100
      const featureChunks = []
      
      for (let i = 0; i < processedFeatures.length; i += CHUNK_SIZE) {
        const chunk = processedFeatures.slice(i, i + CHUNK_SIZE)
        const chunkSize = (new TextEncoder().encode(JSON.stringify(chunk)).length / 1024 / 1024).toFixed(2)
        console.log(`Chunk ${featureChunks.length + 1} size: ${chunkSize}MB with ${chunk.length} features`)
        featureChunks.push(chunk)
      }

      // Create raw sections in chunks
      setIsCreatingBaseline(true)
      for (let i = 0; i < featureChunks.length; i++) {
        const chunk = featureChunks[i]
        console.log(`Processing chunk ${i + 1}/${featureChunks.length} with ${chunk.length} features`)
        await rpc.invoke('createRawSections', [chunk])
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Wait for sections to be created and baked
      await new Promise(resolve => setTimeout(resolve, 500))

      // Calculate baseline stats
      const baselineStats = await calculateSummaryStats('Baseline')
      if (baselineStats) {
        setSummaryStats(prevStats => ({
          ...prevStats,
          baseline: baselineStats
        }))
      }

      setHasBaseline(true)
      setIsCardsExpanded(true)
    } catch (error) {
      console.error('Error creating baseline layer:', error)
    } finally {
      setIsCreatingBaseline(false)
    }
  }

  const handleCreateScenario = async () => {
    try {
      const projectLayers = giraffeState.get('projectLayers')
      const shortlistLayer = projectLayers.find(layer => layer.layer_full?.name?.includes('Shortlist'))
      if (!shortlistLayer) {
        console.error('No shortlist layer found')
        return
      }

      const layerData = await rpc.invoke('getLayerContents', [shortlistLayer.layer_full.name])
      if (!layerData?.features) {
        console.error('No features found in shortlist layer')
        return
      }

      setIsCreatingScenario(true)
      
      try {
        await createScenarioFeatures(layerData);
        
        // Wait for sections to be created and baked
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Calculate scenario stats
        const scenarioStats = await calculateSummaryStats('Scenario')
        if (scenarioStats) {
          setSummaryStats(prevStats => ({
            ...prevStats,
            scenario: scenarioStats
          }))
        }

        setHasScenario(true)
      } catch (error) {
        console.error('Error in scenario creation:', error)
      }
    } catch (error) {
      console.error('Error creating scenario layer:', error)
    } finally {
      setIsCreatingScenario(false)
    }
  }

  const handleScenarioDataUpdate = async (index, field, value) => {
    try {
      // Update local state first for immediate feedback
      const newData = [...scenarioData]
      if (field === 'usage') {
        // Get land use configuration for the new usage
        const landUse = giraffeState.get('projectAppsByAppID')?.[1]?.featureCategories?.usage?.[value]?.join
        if (landUse) {
          newData[index] = {
            ...newData[index],
            usage: value,
            newFsr: landUse.floorRatioTarget?.toFixed(1) || '0.0',
            newHob: Math.round(landUse.heightOfBuilding || 0)
          }
        }
      } else if (field === 'newFsr') {
        newData[index][field] = parseFloat(value).toFixed(1)
      } else if (field === 'newHob') {
        newData[index][field] = Math.round(value)
      }
      setScenarioData(newData)

      // Only update features if scenario layer exists
      if (hasScenario) {
        // Get the raw sections from giraffeState
        const rawSections = giraffeState.get('rawSections')
        if (!rawSections?.features) {
          console.error('No raw sections found')
          return
        }

        const zoneId = scenarioData[index].zone
        console.log('Updating zone:', zoneId, 'field:', field, 'value:', value)

        // Find all features in this zone
        const zoneFeatures = rawSections.features.filter(f => 
          f.properties?.layerId === 'Scenario' && 
          f.properties?.site_suitability__principal_zone_identifier === zoneId
        )

        if (!zoneFeatures.length) {
          console.error('No features found for zone:', zoneId)
          return
        }

        console.log(`Found ${zoneFeatures.length} features to update for zone ${zoneId}`)

        // If updating usage, get new land use configuration
        let updatedProperties = {}
        if (field === 'usage') {
          const landUse = giraffeState.get('projectAppsByAppID')?.[1]?.featureCategories?.usage?.[value]?.join
          if (landUse) {
            updatedProperties = {
              usage: value,
              usage_current: value,
              usage_updated: value,
              // Update all related assumptions from land use
              floor_space_ratio_updated: landUse.floorRatioTarget || 0,
              height_of_building_updated: Math.round(landUse.heightOfBuilding || 0),
              ratioResidential_updated: landUse['Ratio Residential'] || 0,
              dwellingSize_updated: landUse['Dwelling Size'] || 1,
              personsPerDw_updated: landUse['Persons per Dw'] || 0,
              ratioEmployment_updated: landUse['Ratio Employment'] || 0,
              m2PerJob_updated: landUse['m2 per Job'] || 1,
              isOpenSpace_updated: landUse.isOpenSpace || false
            }
          }
        } else {
          // For other fields, just update the specific field
          const fieldName = field === 'newFsr' ? 'floor_space_ratio' : 
                          field === 'newHob' ? 'height_of_building' : field
          updatedProperties = {
            [`${fieldName}_updated`]: field === 'newHob' ? Math.round(value) : value
          }
        }

        // Update each feature individually
        for (const feature of zoneFeatures) {
          const updatedFeature = {
            ...feature,
            properties: {
              ...feature.properties,
              ...updatedProperties
            }
          }
          await rpc.invoke('updateRawSection', [updatedFeature])
        }

        // Wait for updates to be processed
        await new Promise(resolve => setTimeout(resolve, 500))

        // Update scenario stats
        const scenarioStats = await calculateSummaryStats('Scenario')
        if (scenarioStats) {
          setSummaryStats(prevStats => ({
            ...prevStats,
            scenario: scenarioStats
          }))
        }
      }
    } catch (error) {
      console.error('Error updating scenario data:', error)
    }
  }

  const handleRowClick = async (zoneId) => {
    if (expandedRow === zoneId) {
      setExpandedRow(null)
      setFeatureList([])
      return
    }

    const rawSections = giraffeState.get('rawSections')
    if (!rawSections?.features) {
      console.error('No features found')
      return
    }

    // Find features for this zone
    const features = rawSections.features.filter(f => 
      f.properties?.site_suitability__principal_zone_identifier === zoneId
    )

    // Extract relevant properties
    const featureDetails = features.map(f => {
      const fsr = parseFloat(f.properties.site_suitability__floorspace_ratio) || 0
      return {
        id: f.properties.id,
        zone: f.properties.site_suitability__principal_zone_identifier,
        address: f.properties?.site_suitability__address || f.properties?.site__address || 'No address',
        fsr: fsr.toFixed(1),
        hob: Math.round(f.properties.site_suitability__height_of_building || f.properties.height_of_building || 0),
        area: f.properties?.site_suitability__area || 0,
        geometry: f.geometry // Store the geometry for flying to
      }
    })

    setFeatureList(featureDetails)
    setExpandedRow(zoneId)
  }

  const handleAddressClick = (feature) => {
    if (!feature?.geometry?.coordinates) {
      console.error('Invalid feature geometry', feature)
      return
    }

    // Get the center point of the feature
    const coordinates = feature.geometry.type === 'Polygon' 
      ? feature.geometry.coordinates[0]?.[0] // First point of first ring for polygons
      : feature.geometry.coordinates // Point coordinates

    if (!coordinates) {
      console.error('Could not get coordinates from feature', feature)
      return
    }

    // Fly to the feature with some padding and zoom
    rpc.invoke('flyTo', [{
      center: coordinates,
      zoom: 18,
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      duration: 2000 // 2 second animation
    }])
  }

  const handleAddressHover = (feature, isHovering) => {
    if (!feature?.geometry) {
      console.error('Invalid feature geometry for highlighting', feature)
      return
    }

    try {
      if (isHovering) {
        // Create a single feature with required properties
        const highlightFeature = {
          type: 'Feature',
          id: feature.id,
          geometry: feature.geometry,
          properties: {}
        }
        rpc.invoke('setHighlightedFeatures', [highlightFeature])
      } else {
        rpc.invoke('setHighlightedFeatures', [])
      }
    } catch (error) {
      console.error('Error highlighting feature:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-[1200px]">
        <div className="border-b border-gray-900 pb-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SquareStack className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Scenario Planning</h1>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Shortlist Summary
            </button>
          </div>
        </div>

        {/* How it works modal */}
        <EnhancedGFAExplanation 
          isOpen={isHowItWorksOpen} 
          onOpenChange={setIsHowItWorksOpen}
        />

        <div className="relative">
          <button 
            onClick={() => setIsCardsExpanded(!isCardsExpanded)}
            className="absolute right-0 -top-4 text-blue-600 hover:text-blue-700 transition-colors z-20 !p-0 !bg-transparent !border-0"
          >
            <svg 
              className={`w-5 h-5 transition-transform duration-300 ${isCardsExpanded ? '' : '-rotate-90'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          <div className={`transition-all duration-300 origin-top overflow-hidden ${isCardsExpanded ? 'scale-y-100 opacity-100 mb-8' : 'scale-y-0 opacity-0 h-0 mb-0'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative mt-2">
              <div 
                className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl shadow-md border border-blue-100 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-lg h-full"
              >
                <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-blue-600" />
                  Transform and Develop
                </h2>
                <p className="text-gray-700 leading-relaxed text-base">
                  Work with scenarios to explore how land could be transformed and developed into new <span className="text-blue-600 font-medium">usages</span>, 
                  or how policy changes like rezoning could impact an area.
                </p>
              </div>

              {/* Arrow connecting the cards */}
              <div className="hidden md:block absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
              </div>

              <div 
                className="bg-gradient-to-l from-blue-50 to-white p-6 rounded-xl shadow-md border border-blue-100 transform hover:scale-[1.02] transition-all duration-300 hover:shadow-lg h-full"
              >
                <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Land Use Typology & Application
                </h2>
                <div className="space-y-3">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    A <span className="text-blue-600 font-medium">usage</span> is a land use typology with assumptions on dwellings, jobs, space, costs and much more. 
                    Usages are auto applied to all sites when created from a shortlist.
                  </p>
                  <p className="text-gray-700 leading-relaxed text-sm border-t border-blue-100 pt-3">
                    Each site's Principal Zone Identifier is determining what usage to apply.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {isCardsExpanded && <div className="border-b border-gray-900 my-8"></div>}
          
          {shortlistName && (
            <div className="flex items-center gap-2 text-gray-800 text-base mb-8 bg-green-50 p-3 rounded-lg border border-green-100">
              <span className="font-medium">Selected Shortlist:</span> 
              <span className="flex items-center gap-2">
                {shortlistName}
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-gray-700">Step 1:</span>
              <button
                onClick={handleCreateBaseline}
                disabled={isCreatingBaseline || hasBaseline}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isCreatingBaseline ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Layers className="w-5 h-5" />
                )}
                {isCreatingBaseline ? 'Setting Baseline...' : 'Set Baseline'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-lg font-medium text-gray-700">Step 2:</span>
              <button
                onClick={handleCreateScenario}
                disabled={isCreatingScenario || hasScenario || !hasBaseline}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors text-lg font-medium shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed ${hasBaseline ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-600'}`}
              >
                {isCreatingScenario ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LayoutGrid className="w-5 h-5" />
                )}
                {isCreatingScenario ? 'Creating Scenario...' : 'Add Scenario'}
              </button>
            </div>
          </div>

          {hasBaseline && (
            <>
              <div className="mt-8 overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-1/4">Zone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-16">Avg FSR (n:1)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-16">Avg HOB (m)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-2/5">New Usage</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-16">New FSR (n:1)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-16">New HOB (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioData.map((row, index) => (
                      <React.Fragment key={row.id}>
                        <tr 
                          className={`hover:bg-gray-50 cursor-pointer ${expandedRow === row.id ? 'bg-gray-50' : ''}`}
                          onClick={() => handleRowClick(row.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-sm flex-shrink-0" 
                                style={{ 
                                  backgroundColor: ZONE_COLORS[row.zone.split(' - ')[0]] || '#3b82f6',
                                  border: '1px solid rgba(0,0,0,0.1)'
                                }} 
                              />
                              <div>
                                <div className="text-sm text-gray-900 font-medium">{row.zone.split(' - ')[0]}</div>
                                <div className="text-xs text-gray-500">
                                  {row.zone.split(' - ').slice(1).join(' ')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.currentFsr}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.currentHob}</td>
                          <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-full">
                                    <CustomSelect
                                      value={row.usage}
                                      options={Object.entries(usageMapping).sort((a, b) => a[1].localeCompare(b[1]))}
                                      onChange={(value) => handleScenarioDataUpdate(index, 'usage', value)}
                                    />
                                  </div>
                                </TooltipTrigger>
                                {usageAssumptions[row.usage] && (
                                  <TooltipContent 
                                    className="max-w-sm"
                                    style={{ 
                                      borderColor: ZONE_COLORS[row.usage.split(' - ')[0]] || '#3b82f6',
                                      borderWidth: '2px'
                                    }}
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-sm flex-shrink-0" 
                                          style={{ 
                                            backgroundColor: ZONE_COLORS[row.usage.split(' - ')[0]] || '#3b82f6',
                                            border: '1px solid rgba(0,0,0,0.1)'
                                          }} 
                                        />
                                        <div className="font-medium">{row.usage}</div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-gray-200 pt-2">
                                        <div className="text-gray-600 flex items-center gap-1">
                                          <Ruler className="w-3 h-3" />
                                          Dwelling Size:
                                        </div>
                                        <div>{usageAssumptions[row.usage].dwellingSize ? `${usageAssumptions[row.usage].dwellingSize} m²` : 'Not applicable'}</div>
                                        
                                        <div className="text-gray-600 flex items-center gap-1">
                                          <Users className="w-3 h-3" />
                                          Persons Per Dwelling:
                                        </div>
                                        <div>{usageAssumptions[row.usage].personsPerDw || 'Not applicable'}</div>
                                        
                                        <div className="text-gray-600 flex items-center gap-1">
                                          <Briefcase className="w-3 h-3" />
                                          Employment Ratio:
                                        </div>
                                        <div>{usageAssumptions[row.usage].ratioEmployment || '0%'}</div>
                                        
                                        <div className="text-gray-600 flex items-center gap-1">
                                          <Home className="w-3 h-3" />
                                          Residential Ratio:
                                        </div>
                                        <div>{usageAssumptions[row.usage].ratioResidential || '0%'}</div>
                                        
                                        <div className="text-gray-600 flex items-center gap-1">
                                          <Building className="w-3 h-3" />
                                          Equivalent Zoning:
                                        </div>
                                        <div>{usageAssumptions[row.usage].equivalentZoning || 'None'}</div>
                                        
                                        <div className="text-gray-600 flex items-center gap-1">
                                          <Square className="w-3 h-3" />
                                          m² Per Job:
                                        </div>
                                        <div>{usageAssumptions[row.usage].m2PerJob || '0'}</div>
                                        
                                        <div className="text-gray-600 flex items-center gap-1">
                                          <MapPin className="w-3 h-3" />
                                          Is Open Space:
                                        </div>
                                        <div>{usageAssumptions[row.usage].isOpenSpace ? 'Yes' : 'No'}</div>
                                      </div>
                                      {usageAssumptions[row.usage].description && (
                                        <div className="text-gray-600 text-xs border-t border-gray-200 pt-2">
                                          <div className="font-medium mb-1 flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            Description and Source:
                                          </div>
                                          <div>{usageAssumptions[row.usage].description}</div>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <input
                              type="number"
                              step="0.1"
                              value={row.newFsr}
                              onChange={(e) => handleScenarioDataUpdate(index, 'newFsr', parseFloat(e.target.value))}
                              className="w-16 border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
                              onClick={(e) => e.stopPropagation()} // Prevent row click when clicking input
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <input
                              type="number"
                              step="1"
                              value={row.newHob}
                              onChange={(e) => handleScenarioDataUpdate(index, 'newHob', parseFloat(e.target.value))}
                              className="w-16 border border-gray-300 rounded px-2 py-1 bg-white text-gray-900"
                              onClick={(e) => e.stopPropagation()} // Prevent row click when clicking input
                            />
                          </td>
                        </tr>
                        {expandedRow === row.id && (
                          <tr key={`${row.id}-details`}>
                            <td colSpan="6" className="px-4 py-2 bg-gray-50">
                              <div className="bg-gray-100 sticky top-0 z-10">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr>
                                      <th className="px-4 py-2 text-left w-2/5">Address</th>
                                      <th className="px-4 py-2 text-center w-1/5">Area</th>
                                      <th className="px-4 py-2 text-center w-1/5">Current FSR</th>
                                      <th className="px-4 py-2 text-center w-1/5">Current HOB</th>
                                    </tr>
                                  </thead>
                                </table>
                              </div>
                              <div className="max-h-60 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                  <tbody>
                                    {featureList.map(feature => (
                                      <tr 
                                        key={feature.id} 
                                        className="hover:bg-gray-100"
                                        onMouseEnter={() => handleAddressHover(feature, true)}
                                        onMouseLeave={() => handleAddressHover(feature, false)}
                                      >
                                        <td 
                                          className="px-4 py-2 w-2/5 cursor-pointer hover:text-blue-600" 
                                          onClick={() => handleAddressClick(feature)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <div 
                                              className="w-2 h-2 rounded-sm flex-shrink-0" 
                                              style={{ 
                                                backgroundColor: ZONE_COLORS[feature.zone.split(' - ')[0]] || '#3b82f6',
                                                border: '1px solid rgba(0,0,0,0.1)'
                                              }} 
                                            />
                                            <span>{feature.address}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-center w-1/5">
                                          {feature.area.toLocaleString('en-AU')} m²
                                        </td>
                                        <td className="px-4 py-2 text-center w-1/5">{feature.fsr}</td>
                                        <td className="px-4 py-2 text-center w-1/5">{feature.hob}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-b border-gray-900 my-8"></div>

              <DataFlowAnimation />

              <div className="mt-4 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Summary Statistics</h2>
                  <button
                    onClick={() => setIsHowItWorksOpen(true)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    How it works
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Metric</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Baseline</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Scenario</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Total GFA (m²)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.baseline.totalGFA.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.scenario.totalGFA.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`font-medium ${summaryStats.scenario.totalGFA - summaryStats.baseline.totalGFA > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(summaryStats.scenario.totalGFA - summaryStats.baseline.totalGFA).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Total Dwellings</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.baseline.totalDwellings.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.scenario.totalDwellings.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`font-medium ${summaryStats.scenario.totalDwellings - summaryStats.baseline.totalDwellings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(summaryStats.scenario.totalDwellings - summaryStats.baseline.totalDwellings).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Total People</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.baseline.totalPeople.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.scenario.totalPeople.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`font-medium ${summaryStats.scenario.totalPeople - summaryStats.baseline.totalPeople > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(summaryStats.scenario.totalPeople - summaryStats.baseline.totalPeople).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Total Jobs</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.baseline.totalJobs.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.scenario.totalJobs.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`font-medium ${summaryStats.scenario.totalJobs - summaryStats.baseline.totalJobs > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(summaryStats.scenario.totalJobs - summaryStats.baseline.totalJobs).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <TreePine className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Open Space (m²)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.baseline.openSpace.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{summaryStats.scenario.openSpace.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`font-medium ${summaryStats.scenario.openSpace - summaryStats.baseline.openSpace > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(summaryStats.scenario.openSpace - summaryStats.baseline.openSpace).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <TreePine className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">Open Space Per Person</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{(summaryStats.baseline.openSpace / (summaryStats.baseline.totalPeople || 1)).toFixed(1)} m²</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{(summaryStats.scenario.openSpace / (summaryStats.scenario.totalPeople || 1)).toFixed(1)} m²</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`font-medium ${(summaryStats.scenario.openSpace / (summaryStats.scenario.totalPeople || 1)) - (summaryStats.baseline.openSpace / (summaryStats.baseline.totalPeople || 1)) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((summaryStats.scenario.openSpace / (summaryStats.scenario.totalPeople || 1)) - (summaryStats.baseline.openSpace / (summaryStats.baseline.totalPeople || 1))).toFixed(1)} m²
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

ScenarioPlanningPage.propTypes = {
  onBack: PropTypes.func.isRequired
}

export default ScenarioPlanningPage 