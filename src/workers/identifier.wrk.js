const R = require('ramda');
const Future = require('fluture');
const { Maybe, Nothing } = require('simple-maybe');
const db = require('../models/index');
const Op = db.Sequelize.Op;
const flatten = require('array-flatten');

const {
    Question,
    Inquiry,
    Fail,
    Pass,
    $$passSymbol
} = require('inquiry-monad');

const { Truth } = require('booltable');

const findAllAcousticFiles = Future.encaseP(a => db.AcousticFile.findAll(a));
const findAllObservations = Future.encaseP(a => db.Observation.findAll(a));
const findAllIdentifiers = Future.encaseP(a => db.Identifier.findAll(a));
const createLog = Future.encaseP(a => db.Log.create(a));
const createIdentification = Future.encaseP(a => db.Identification.create(a));
const updateIdentification = Future.encaseP(([a, b]) =>
    db.Identification.update(a, b)
);
const updateAcousticFile = Future.encaseP(([a, b]) =>
    db.AcousticFile.update(a, b)
);

const removePossible = text => text.replace(/^possible\s/, '');
const startsWithPossible = text => text.match(/^possible\s/);
const containsQuestionMark = text => text.match(/\?/);

const detectBird6 = text =>
    Maybe.of(text)
        .map(a => a.match(/^[A-Z]{4,6}([\s\W]|$)/))
        .map(a => a.shift().substring(0, 6))
        .fork(_ => false, a => a);

const detectBird4 = text =>
    Maybe.of(text)
        .map(a => a.match(/^[A-Z]{4}([\s\W]|$)/))
        .map(a => a.shift().substring(0, 4))
        .fork(_ => false, a => a);

const hasBandingCodes = Question.of([
    'does it have banding codes?',
    x =>
        Maybe.of(x)
            .map(removePossible)
            .map(a => detectBird4(a) || detectBird6(a) || Nothing)
            .fork(Fail, a => Pass({ bandingCode: a }))
]);

const isUncertain = Question.of([
    'is the identification uncertain?',
    x =>
        Truth.of([startsWithPossible(x), containsQuestionMark(x)]).forkOr(
            Fail,
            a => Pass({ uncertain: true })
        )
]);

const hasAbundance = Question.of([
    'is there an indication of abundance?',
    x =>
        Maybe.of(x)
            .map(a => a.match(/\s[0-9]*($|\s|\*)/))
            .map(a =>
                a
                    .shift()
                    .trim()
                    .replace(/\D/g, '')
            )
            .fork(Fail, n => (n ? Pass({ abundance: Number(n) }) : Fail(n)))
]);

const isImportant = Question.of([
    'is it flagged as important?',
    x =>
        Maybe.of(x)
            .map(a => a.match(/!/))
            .fork(Fail, () => Pass({ important: true }))
]);

const isUnknown = Question.of([
    'is it described as unknown?',
    x =>
        Maybe.of(x)
            .map(a => (a.substring(0, 4) === 'unkn' ? true : Nothing))
            .fork(Fail, a => Pass({ unknown: true }))
]);

const isHighQuality = Question.of([
    'is it a high quality recording?',
    x =>
        Maybe.of(x)
            .map(a => a.match(/\*$/))
            .fork(Fail, a => Pass({ highQuality: true }))
]);

const hasProjectMatches = ({ projectId, projectIdentifiers }) =>
    Question.of([
        'does it match project identifier strings?',
        x =>
            Maybe.of(x)
                .map(a =>
                    projectIdentifiers.find(id => a.startsWith(id.get('match')))
                ) // @todo actually check projectId
                .fork(Fail, a =>
                    a ? Pass({ projectMatch: a }) : Fail('not found')
                )
    ]);

/*
 @todo list: slashes (MALL/ABDU, etc)
*/
const inquireIdentifiers = ({ projectId, projectIdentifiers }) => label =>
    Inquiry.subject(label)
        .inquire(hasBandingCodes)
        .inquire(isUncertain)
        .inquire(hasAbundance)
        .inquire(isUnknown)
        .inquire(isImportant)
        .inquire(isHighQuality)
        .inquire(hasProjectMatches({ projectId, projectIdentifiers }))
        .join();

const parseIdentifiers = ({ observation, projectIdentifiers }) => {
    const labelText = observation.get('data').labelText;
    const labels = labelText.split(',').map(a => a.trim());
    const projectId = observation.Survey.Cycle.get('projectId');
    return labels
        .map(inquireIdentifiers({ projectId, projectIdentifiers }))
        .map(a => {
            return a.pass
                .join()
                .reduce((acc, cur) => Object.assign(acc, cur), {});
        });
};

const findProjectIdentifiers = identifiers => idqs =>
    R.prop('projectMatch', identifiers) && idqs.length === 0
        ? Future.both(
              Future.of(R.omit(['projectMatch'], identifiers)),
              Future.of([identifiers.projectMatch])
          )
        : Future.both(Future.of(identifiers), Future.of(idqs));

const findIdentifiersByBandingCode = identifiers =>
    identifiers.bandingCode
        ? findAllIdentifiers({
              where: {
                  match: identifiers.bandingCode,
                  type: 'birdpop-alpha-2018'
              }
          }).chain(findProjectIdentifiers(identifiers))
        : findProjectIdentifiers(identifiers)([]);

const checkDbIdentifiers = ({ observation, projectIdentifiers }) =>
    parseIdentifiers({ observation, projectIdentifiers }).map(
        findIdentifiersByBandingCode
    );

const deriveIdentifications = projectIdentifiers => observation =>
    Future.parallel(1, checkDbIdentifiers({ observation, projectIdentifiers }))
        .chain(results =>
            Future.both(
                Future.of(results),
                // invalidate previous identifications with this observationId
                updateIdentification([
                    {
                        invalid: 1
                    },
                    {
                        where: {
                            observationId: observation.get('id')
                        }
                    }
                ])
            )
        )
        .chain(([results, _]) =>
            Future.parallel(
                1,
                results.map(([identifiers, idqs]) => {
                    const idqPrimaryId =
                        idqs && idqs.length ? idqs[0].get('id') : null;
                    const idqMultiple = idqs && idqs.length > 1;
                    return createIdentification({
                        observationId: observation.get('id'),
                        identifierId: idqPrimaryId,
                        data: identifiers
                    });
                })
            )
        );

// flag as scanned; later, individual observations might be triggered by changes though
const flagAcousticFile = (file, callback) =>
    updateAcousticFile([
        {
            data: Object.assign(file.get('data'), {
                derived: { identification: true }
            })
        },
        {
            where: {
                id: file.get('id')
            }
        }
    ]);

const getObservationsFromFile = file =>
    findAllObservations({
        where: {
            data: {
                filename: file
            },
            invalid: null
        },
        include: [
            {
                model: db.Survey,
                include: [db.Cycle]
            }
        ]
    });

// main thing
const getAcousticFiles = callback =>
    findAllAcousticFiles({
        where: db.Sequelize.literal(
            "json_unquote(json_extract(`AcousticFile`.`data`,'$.derived.identification')) IS NULL"
        )
    })
        .chain(files => {
            const collectObservations = () =>
                files.map(file =>
                    getObservationsFromFile(file.get('name')).chain(
                        observations =>
                            flagAcousticFile(file).map(() => observations)
                    )
                );
            return files.length
                ? Future.parallel(1, collectObservations())
                : Future.reject([]);
        })
        .chain(observationsCollection =>
            Future.both(
                Future.of(observationsCollection),
                findAllIdentifiers({
                    where: {
                        type: 'project-identifier'
                    }
                })
            )
        )
        .chain(([observationsCollection, projectIdentifiers]) => {
            // we have all the observations of all files, but not in a flat array yet.
            const observations = flatten(observationsCollection);
            return Future.parallel(
                1,
                observations.map(deriveIdentifications(projectIdentifiers))
            );
        })
        .fork(err => {
            console.error(err);
            callback();
        }, callback);

/*
 5. add viewer for Identifications to Observations view
 6. add means to request new identification
*/

module.exports = {
    parseIdentifiers,
    deriveIdentifications,
    getAcousticFiles
};
