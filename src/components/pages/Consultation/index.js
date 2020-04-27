import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import CssBaseline from '@material-ui/core/CssBaseline';
import axios from 'axios';
import DefaultLayout from '../../templates/DefaultLayout';
import Messages from '../../organisms/Messages';
import SideNav from '../../organisms/SideNav';
import wsUtil from '../../../utils/webSocket';
import { CONSULTATION_ID, PRACTIONER_ID } from '../../../utils/Constants.js';

import { Button, Form, FormGroup, Label, Input, FormText } from 'reactstrap';

import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';


const Layout = styled.div`
  display: flex;
`;

const socket = wsUtil.getSocket();

const Consultation = (props) => {
  const [activeConsultation, setActiveConsultation] = useState(null); // TODO: Change Hardcode
  const [consultations, setConsultations] = useState({});
  const [tab, setTab] = useState(1);
  const [file, setFile] = useState(null);
  const [fileLink, setfileLink] = useState(false);

  const {
    buttonLabel,
    className
  } = props;

  const onTabChange = (to) => {
    setTab(to)
  }
  const [modal, setModal] = useState(false);

  const toggle = () => setModal(!modal);

  const onMessageSubmit = (msg) => {
    if(!consultations[activeConsultation].practitioner) {
      fetch('http://localhost:8081/register/patient_practitioner', {
        method: "POST",
        body: JSON.stringify({
          patient: consultations[activeConsultation].patient,
          practitioner: PRACTIONER_ID}
        ),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      })
      .then(() => {
        setConsultations(prevConsultations => ({
            ...prevConsultations,
            [activeConsultation]: {
              ...prevConsultations[activeConsultation],
              practitioner: PRACTIONER_ID
            }
          }))
          setTab(0)
        })
      .then(() => wsUtil.send(socket, activeConsultation, msg))
    } else {
      wsUtil.send(socket, activeConsultation, msg);
    }
  };

  useEffect(() => {
    fetch(`http://localhost:8081/consultation/${PRACTIONER_ID}`)
    .then(data => data.json())
    .then(data => {
      data.forEach(consultationWrapper => {
        const {patient, consultation } = consultationWrapper;
        setConsultations(prevConsultations => ({
          ...prevConsultations,
          [consultation._id]: {
            ...consultation,
            name: `${patient.name.first_name} ${patient.name.last_name}`
          }
        }))
      })
    })
    .catch(error => console.error(error)) 
  }, [])

  useEffect(() => {
    wsUtil.addMessageListener(socket, (data) => {
      const { consultation, msg } = data;
      setConsultations((prevConsultations) => ({
        ...prevConsultations,
        [consultation]: {
          ...prevConsultations[consultation],
          messages: [ ...(prevConsultations[consultation].messages || []), msg]
        }
      }));
    });
  }, []);
  
  const onSidebarItemClicked = consultationId => {
    setActiveConsultation(consultationId);
  }

  const submitForm = (contentType, data, setResponse) =>  {
    axios({
    url: 'http://localhost:8081/documents/upload',
    method: 'POST',
    data: data,
    headers: {
    'Content-Type': contentType
    }
    }).then((response) => {
    if(response.status === 200) {
      setfileLink(response.data);
      document.getElementById("document-form").reset();

    }
    }).catch((error) => {
    setResponse("error");
    })
   }

  const uploadDocument = (e) => {
    e.preventDefault();
    let res;
    let UploadDocument = document.getElementById('fileinput')
    if(UploadDocument.files.length) {
      const formData = new FormData();
      formData.append("document", file);
     
      submitForm("multipart/form-data", formData, (msg) => console.log(msg));
    }
    else {
      alert('please select a file');
      console.log('please select a file');
    }
  }

  return (
    <>
      <CssBaseline />
      <DefaultLayout>
        <div>
          <h3>Upload Document to share with Patients</h3>
          <Button  color="primary" onClick={toggle}>Upload</Button>
          <Modal isOpen={modal} toggle={toggle} className={className}>
            <ModalHeader toggle={toggle}>Upload Document</ModalHeader>
            <ModalBody>
            {fileLink}
              <p>Securely uplaod document</p>
              <Form id="document-form" onSubmit={ e => { uploadDocument(e); }  }>
              <FormGroup>
                <Label for="document">File</Label>
                <Input type="file" name="document" id="fileinput" onChange={(e) => setFile(e.target.files[0])} />
                <FormText color="muted">
                  Upload a file and get a url to share with patients
                </FormText>
              </FormGroup>     
              <Button>Submit</Button>

            </Form>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={toggle}>Cancel</Button>
            </ModalFooter>
          </Modal>
        </div>
        <Layout>
          <SideNav
            activeTab={tab}
            onTabChange={onTabChange}
            onClick={onSidebarItemClicked}
            consultations={consultations}
            activeConvo={activeConsultation}/>
          { activeConsultation ? 
            <Messages
              onMessageSubmit={onMessageSubmit}
              room={activeConsultation}
              consultation={(consultations[activeConsultation] || {name: '', messages: []})} />
              :
              <div/>
          }
        </Layout>
      </DefaultLayout>
    </>
  );
};

Consultation.propTypes = {};

export default Consultation;
