import React, { useState, Fragment } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Modal } from 'oskari-ui/components/Modal';
import { Message, Badge, Button } from 'oskari-ui';
import { PropertiesFilter, PropertiesLocale, PropertiesFormat } from '../../../../admin/admin-layereditor/view/AdminLayerForm/AdditionalTabPane/VectorLayerAttributes/';

const Buttons = styled.div`
    display: inline-flex;
    > * {
        margin-right: 20px;
    }
`;

// Clean empty objects and values that doesn't need to store
// data.format: false options
// data.locale: empty strings
const clean = obj => {
    for (const key in obj) {
        const val = obj[key];
        if(typeof val === "object" && !Array.isArray(val) && val !== null) {
            if (!Object.keys(val).length) {
                delete obj[key];
            } else {
                clean(val);
            }
        } else if (typeof val === 'string' && !val.trim().length) {
            delete obj[key];
        } else if (val === null || val === false) {
            delete obj[key];
        }
    }
    return obj;
};

const toFilter = (fields) => {
    if (!fields.some(f => !!f.index)) {
        return {};
    }
    const filter = {};
    ["default", ...Oskari.getSupportedLanguages()].forEach(lang => {
        const filtered = fields.filter(f => !!f.index && typeof f.index[lang] !== 'undefined');
        if (filtered.length > 0) {
            filter[lang] = new Array(filtered.length);
            filtered.forEach(f => {
                filter[lang][f.index[lang]] = f.name;
            })
        }
    });

    return filter;
}

const toLocale = (fields) => {
    return fields.reduce((a, field) => {
        Object.keys(field.locales).forEach((lang) => {
            const l = a[lang] ??= {};
            l[field.name] = field.locales[lang];
        })
        return a;
    }, {});
}

const toFormat = (fields) => {
    return fields.filter(f => !!f.format && Object.keys(f.format).length).reduce((a, field) => {
        a[field.name] = field.format;
        return a;
    }, {});
}

const stateToField = (prop, filter, locale, format) => {
    const index = {};
    Object.keys(filter).forEach(lang => {
        const i = filter[lang].indexOf(prop.name);
        if (i >= 0) {
            index[lang] = i;
        }
    });

    const locales = {};
    Object.keys(locale).forEach(lang => {
        const label = locale[lang][prop.name];
        if (label) {
            locales[lang] = label;
        }
    });

    return {
        index: index,
        locales: locales,
        format: format[prop.name],
        name: prop.name,
        type: prop.type
    }
}

const stateToFields = (props, filter, locale, format) =>
    props.map(prop => stateToField(prop, filter, locale, format));

export const PropertiesTab = ({ fields, updateFields,  }) => {
    const data = {
        filter: toFilter(fields),
        locale: toLocale(fields),
        format: toFormat(fields)
    };

    const [modal, setModal] = useState(null);
    const [state, setState] = useState({
        filter: data.filter,
        locale: data.locale,
        format: data.format
    });

    const getButtonForModal = type => {
        const value = state[type] || {};
        const count = Object.keys(value).length;
        return (
            <Badge count={count} showZero={false}>
                <Button onClick={() => setModal(type)}>
                    <Message messageKey={`attributes.${type}.button`} />
                </Button>
            </Badge>
        );
    };
    const onModalOk = () => {
        const updatedFields = stateToFields(fields, state.filter, state.locale, state.format);
        updateFields(updatedFields);
        setModal(null);
    };
    const onModalUpdate = (value) => {
        setState({ ...state, [modal]: clean(clean(value)) });
    };
    const onModalCancel = () => {
        const attr = data[modal] || {};
        setState({ ...state, [modal]: attr });
        setModal(null);
    };

    const lang = Oskari.getLang();
    const properties = fields.filter(prop => prop.name !== 'geom');
    const propNames = properties.map(prop => prop.name);
    const propLabels = properties.map(prop => prop.locales[lang] || prop.name);
    // gather selected properties from all (localized) filters
    const selectedProperties = state.filter ? [...new Set([].concat(...Object.values(state.filter)))] : [];

    return (
        <Fragment>
            <Message messageKey='attributes.properties'/>
            <div>
                <Buttons>
                    { getButtonForModal('filter') }
                    { getButtonForModal('locale') }
                    { getButtonForModal('format') }
                </Buttons>
            </div>
            <Modal
                mask={ false }
                maskClosable= { false }
                open={ !!modal }
                onOk={ onModalOk}
                onCancel={ onModalCancel }
                cancelText={ <Message messageKey="cancel" /> }
                okText={ <Message messageKey="save" /> }
                width={ 500 }
            >
                <h3><Message messageKey={`attributes.${modal}.title`} /></h3>
                { modal === 'filter' &&
                    <PropertiesFilter update={onModalUpdate} properties={propNames}
                        filter={state.filter} labels={propLabels}/>
                }
                { modal === 'locale' &&
                    <PropertiesLocale update={onModalUpdate} locale={state.locale}
                        properties={propNames} selected={selectedProperties}/>
                }
                { modal === 'format' &&
                    <PropertiesFormat update={onModalUpdate} properties={propNames}
                        format={state.format} labels={propLabels} selected={selectedProperties}/>
                }
            </Modal>
        </Fragment>
    );
}

PropertiesTab.propTypes = {
    fields: PropTypes.array.isRequired,
    updateFields: PropTypes.func.isRequired
};
