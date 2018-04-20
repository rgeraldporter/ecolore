const breedingCodes = [
    {
        name: 'Nest with Young',
        description: 'Nest with young seen or heard.',
        code: 'NY',
        status: 'confirmed'
    },
    {
        name: 'Nest with Eggs',
        description: 'Nest with eggs',

        code: 'NE',
        status: 'confirmed'
    },
    {
        name: 'Occupied Nest',
        description:
            'Occupied nest presumed by parent entering and remaining, exchanging incubation duties, etc.',
        code: 'ON',
        status: 'confirmed'
    },
    {
        name: 'Recently Fledged',
        description:
            'Recently fledged or downy young observed while still dependent upon adults.',
        code: 'FL',
        status: 'confirmed'
    },
    {
        name: 'Feeding Young',
        description:
            'Adult feeding young that have left the nest, but are not yet flying and independent (should not be used with raptors, terns, and other species that may move many miles from the nest site; often supersedes FL).',
        code: 'FY',
        status: 'confirmed'
    },
    {
        name: 'Carrying Fecal Sac',
        description: 'Adult carrying fecal sac.',
        code: 'FS',
        status: 'confirmed'
    },
    {
        name: 'Carrying Food',
        description:
            'Adult carrying food for young (should not be used for corvids, raptors, terns, and certain other species that regularly carry food for courtship or other purposes).',
        code: 'CF',
        status: 'confirmed'
    },
    {
        name: 'Used Nest',
        description:
            'Nest is present, but not active. Use only if you are certain of the species that built the nest.',
        code: 'UN',
        status: 'confirmed'
    },
    {
        name: 'Distraction Display',
        description: 'Distraction display, including feigning injury.',
        code: 'DD',
        status: 'confirmed'
    },
    {
        name: 'Physiological Evidence / Brood Patch',
        description:
            'Physiological evidence of nesting, usually a brood patch. Generally rare.',
        code: 'PE',
        status: 'confirmed'
    },
    {
        name: 'Nest Building',
        description:
            'Nest building at apparent nest site (should not be used for certain wrens, and other species that build dummy nests; see code "B" below for these species).',
        code: 'NB',
        status: 'confirmed/probable'
    },
    {
        name: 'Carrying Nesting Material',
        description: 'Adult carrying nesting material; nest site not seen.',
        code: 'CN',
        status: 'confirmed/probable'
    },
    {
        name: 'Wren/Woodpecker Nest Building',
        description:
            ' Some species, including certain wrens (e.g., Marsh Wren), woodpeckers, and certain other cavity nesters (e.g., barbets) may build dummy nests and thus nest building activity cannot be considered confirmation. Use this category in those cases.',
        code: 'B',
        status: 'probable'
    },
    {
        name: 'Territory held for 7+ days',
        description:
            'Territorial behavior or singing male present at the same location 7+ days apart.',
        code: 'T',
        status: 'probable'
    },
    {
        name: 'Courtship, Display or Copulation',
        description:
            'Courtship or copulation observed, including displays and courtship feeding.',
        code: 'C',
        status: 'probable'
    },
    {
        name: 'Visiting probable Nest site',
        description:
            'Visiting repeatedly probable nest site (primarily hole nesters).',
        code: 'N',
        status: 'probable'
    },
    {
        name: 'Agitated behavior',
        description:
            'Unprompted agitated behavior or anxiety calls from an adult.',
        code: 'A',
        status: 'probable'
    },
    {
        name: 'Pair in suitable habitat (Probable)',
        description:
            'Pair observed in suitable breeding habitat within breeding season.',
        code: 'P',
        status: 'probable'
    },
    {
        name: 'Multiple (7+) singing males',
        description:
            'At least 7 singing males present in suitable nesting habitat during breeding season.',
        code: 'M',
        status: 'probable'
    },
    {
        name: 'Singing Male Present 7+ Days',
        description:
            'Use only if you have observed a singing male at the exact spot (same tree or shrub) one week or more earlier in the season.',
        code: 'S7',
        status: 'probable'
    },
    {
        name: 'Singing male',
        description:
            'Singing male present in suitable nesting habitat during its breeding season.',
        code: 'S',
        status: 'possible'
    },
    {
        name: 'In appropriate habitat',
        description:
            'Adult in suitable nesting habitat during its breeding season.',
        code: 'H',
        status: 'possible'
    },
    {
        name: 'Flyover',
        description:
            'Flying over only -- This is not necessarily a breeding code, but can be a useful behavioral distinction.',
        code: 'F',
        status: 'observed'
    }
];

module.exports = {breedingCodes};